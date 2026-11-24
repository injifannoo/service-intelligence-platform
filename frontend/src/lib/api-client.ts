import { siteConfig } from "@/config/site-config";
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

/** Resolves mock data from data.ts based on endpoint URL */
function getMockFallback(path: string): unknown {
  const clean = path.split("?")[0].replace(/^\/|\/$/g, "");

  if (clean.startsWith("organizations")) {
    const parts = clean.split("/");
    const orgs = (mockData as Record<string, unknown>).organizations || [];
    if (parts.length > 1 && parts[1] && Array.isArray(orgs)) {
      return orgs.find((o: { slug?: string; id?: string }) => o.slug === parts[1] || o.id === parts[1]) || orgs[0];
    }
    return orgs;
  }

  if (clean.startsWith("services")) {
    return (mockData as Record<string, unknown>).services || [];
  }

  if (clean.startsWith("categories")) {
    return (mockData as Record<string, unknown>).categories || [];
  }

  if (clean.startsWith("reviews")) {
    return (mockData as Record<string, unknown>).reviews || [];
  }

  return null;
}

/** True when the app should use the Django REST backend. */
export const usesRestBackend = () => !!siteConfig.apiBaseUrl;

/** Fetch wrapper for /api/v1 with bearer auth, error-envelope handling, and mock fallback. */
export async function apiClient<T>(
  path: string,
  init: RequestInit = {},
  options: { authenticated?: boolean } = {},
): Promise<T> {
  const fallback = (reason: string): T | null => {
    const data = getMockFallback(path);
    if (data !== null) {
      console.warn(`[apiClient] ${reason} - falling back to data.ts for: ${path}`);
      if (Array.isArray(data)) {
        return { count: data.length, next: null, previous: null, results: data } as unknown as T;
      }
      return data as T;
    }
    return null;
  };

  if (!siteConfig.apiBaseUrl) {
    const mock = fallback("No API base URL configured");
    if (mock !== null) return mock;
  }

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.authenticated !== false && typeof window !== "undefined") {
    const token = localStorage.getItem("asip_access_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let res: Response;
  try {
    res = await fetch(`${siteConfig.apiBaseUrl}${path}`, { ...init, headers });
  } catch (networkError: unknown) {
    const msg = networkError instanceof Error ? networkError.message : "Backend offline";
    const mock = fallback(msg);
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

/** Public directory reads collect every page cleanly. */
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
    currentPath = `${parsedUrl.pathname}${parsedUrl.search}`;
  }

  return results;
}