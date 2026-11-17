import { siteConfig } from "@/config/site-config";
import { supabase } from "@/integrations/supabase/client";
import * as mockData from "@/lib/data";

/** Standard API envelope from 05_API_Design. */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

type Page<T> = { results: T[]; count: number; next: string | null; previous: string | null };
type Pagination = Omit<Page<never>, "results">;

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type MockOrg = (typeof mockData.ORGS)[number];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * Shapes a mock organization the way the Django serializer does.
 *
 * The REST callers (`getOrganizations`, `getOrganization`) run the fallback
 * through `fromRestOrganization`/`toView`, so the fallback has to speak the
 * snake_case contract. Returning the raw `data.ts` object left the UI with
 * blank ratings and services whenever the backend was unreachable.
 */
function toRestOrganization(org: MockOrg) {
  return {
    id: org.slug,
    slug: org.slug,
    name: org.name,
    tagline: org.tagline,
    description: org.aiSummary,
    category: org.category,
    services_summary: org.services,
    industries: org.industries,
    location: org.location,
    phone: null,
    email: null,
    website: null,
    business_hours: null,
    founded: org.founded,
    size: org.size,
    price_tier: org.priceTier,
    response_hours: org.responseHours,
    certifications: org.certifications,
    status: org.verified ? "verified" : "pending",
    owner_id: null,
    is_phone_verified: org.verified,
    is_fayda_verified: org.verified,
    has_proof_of_purchase: false,
    verified_at: null,
    logo_url: null,
    ai_insights: {
      sentiment_positive: org.sentiment.positive,
      sentiment_neutral: org.sentiment.neutral,
      sentiment_negative: org.sentiment.negative,
      strengths: org.strengths,
      issues: org.issues,
      summary: org.aiSummary,
      main_complaint: org.issues[0] ?? "",
      recommendation: org.recommendation,
    },
    reviews: org.reviews.map((review) => ({
      rating: review.rating,
      created_at: review.date,
      status: "published",
    })),
  };
}

function toRestService(org: MockOrg, name: string, index: number) {
  return {
    id: `${org.slug}-service-${index + 1}`,
    organization: org.slug,
    organization_id: org.slug,
    organization_name: org.name,
    organization_rating: org.rating,
    category_id: slugify(org.category),
    category_name: org.category,
    name,
    description: `${name} by ${org.name}.`,
    price_from: null,
    status: true,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function toRestReview(org: MockOrg, index: number) {
  const review = org.reviews[index];
  return {
    id: `${org.slug}-review-${index + 1}`,
    org_id: org.slug,
    organization: org.slug,
    organization_id: org.slug,
    organization_name: org.name,
    author: review.author,
    rating: review.rating,
    comment: review.text,
    created_at: review.date,
    verification: review.verified,
    status: "published",
  };
}

/**
 * Resolves mock data from `data.ts` based on the endpoint URL.
 *
 * Returns `null` when no mock exists so callers can surface the real error
 * instead of silently rendering an empty page.
 */
function getMockFallback(path: string): unknown {
  const clean = path.split("?")[0].replace(/^\/|\/$/g, "");
  const [resource, id] = clean.split("/");
  const orgs = mockData.ORGS ?? [];

  if (resource === "organizations") {
    if (id) {
      const org = orgs.find((candidate) => candidate.slug === id);
      return org ? toRestOrganization(org) : null;
    }
    return orgs.map(toRestOrganization);
  }

  if (resource === "services") {
    const services = orgs.flatMap((org) =>
      org.services.map((name, index) => toRestService(org, name, index)),
    );
    if (id) return services.find((service) => service.id === id) ?? null;
    return services;
  }

  if (resource === "categories") {
    const categories = mockData.CATEGORIES.map((name) => ({
      id: slugify(name),
      name,
      description: "",
    }));
    if (id) return categories.find((category) => category.id === id) ?? null;
    return categories;
  }

  if (resource === "reviews") {
    const reviews = orgs.flatMap((org) => org.reviews.map((_, index) => toRestReview(org, index)));
    if (id) return reviews.find((review) => review.id === id) ?? null;
    return reviews;
  }

  return null;
}

/** True when the app should use the Django REST backend instead of Lovable Cloud. */
export const usesRestBackend = () => !!siteConfig.apiBaseUrl;

/** Fetch wrapper for /api/v1 with bearer auth, error-envelope handling, and mock fallback. */
export async function apiClient<T>(
  path: string,
  init: RequestInit = {},
  options: { authenticated?: boolean } = {},
): Promise<T> {
  const fallback = (reason: string): T | null => {
    const data = getMockFallback(path);
    if (data !== null && data !== undefined) {
      console.warn(`[apiClient] ${reason} - falling back to data.ts for: ${path}`);
      // Return in DRF page structure if requested by callers expecting paginated responses
      if (Array.isArray(data)) {
        return { count: data.length, next: null, previous: null, results: data } as unknown as T;
      }
      return data as T;
    }
    return null;
  };

  // If backend base URL is completely absent, resolve fallback immediately
  if (!siteConfig.apiBaseUrl) {
    const mock = fallback("No API base URL configured");
    if (mock !== null) return mock;
  }

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (options.authenticated !== false) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.set("Authorization", `Bearer ${data.session.access_token}`);
    }
  }

  let res: Response;
  try {
    res = await fetch(`${siteConfig.apiBaseUrl}${path}`, { ...init, headers });
  } catch (networkError: unknown) {
    // Intercept ERR_CONNECTION_REFUSED or offline state
    const reason = networkError instanceof Error ? networkError.message : "Backend offline";
    const mock = fallback(reason);
    if (mock !== null) return mock;
    throw networkError;
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | T | null;

  if (
    !res.ok ||
    (body && typeof body === "object" && "success" in body && body.success === false)
  ) {
    const mock = fallback(`Backend returned status ${res.status}`);
    if (mock !== null) return mock;

    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      err?.code ?? "http_error",
      err?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }

  if (body && typeof body === "object" && "success" in body && body.success) {
    const envelope = body as { data: T; pagination?: Pagination };
    if (envelope.pagination && Array.isArray(envelope.data)) {
      return { ...envelope.pagination, results: envelope.data } as T;
    }
    return envelope.data;
  }

  return body as T;
}

/** Public directory reads collect every page without sending Cloud credentials to Django. */
export async function apiListClient<T>(path: string): Promise<T[]> {
  const results: T[] = [];
  const visited = new Set<string>();
  const base = new URL(`${(siteConfig.apiBaseUrl || "http://localhost:8000").replace(/\/$/, "")}/`);

  let currentPath: string | null = path;

  while (currentPath) {
    if (visited.has(currentPath)) break;
    visited.add(currentPath);

    const page: Page<T> = await apiClient<Page<T>>(currentPath, {}, { authenticated: false });

    if (Array.isArray(page)) {
      results.push(...page);
      break;
    }

    if (page && Array.isArray(page.results)) {
      results.push(...page.results);
    }

    if (!page?.next) break;

    const parsedUrl: URL = new URL(page.next, new URL(`${siteConfig.apiBaseUrl}${currentPath}`));
    if (parsedUrl.origin !== base.origin || !parsedUrl.pathname.startsWith(base.pathname)) {
      break;
    }
    // `next` is absolute and already contains the version prefix, while
    // `apiClient` prepends `apiBaseUrl` again. Strip the base path so page two
    // is requested from `/organizations/?page=2`, not `/api/v1/api/v1/...`.
    const nextPath = `${parsedUrl.pathname}${parsedUrl.search}`;
    const relativePath = nextPath.startsWith(base.pathname)
      ? nextPath.slice(base.pathname.length)
      : nextPath.replace(/^\//, "");
    currentPath = `/${relativePath}`;
  }

  return results;
}
