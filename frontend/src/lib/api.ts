import { queryOptions } from "@tanstack/react-query";
import {
  averageRating,
  satisfactionTrend,
  trustScore,
  type OrgView,
} from "./metrics";
import * as mockData from "@/lib/data";
import { resolveOrganizationSubscription } from "./tier-limits";
import type {
  SemanticSearchMatch,
  SemanticSearchRequest,
} from "@/types/platform-contracts";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
).replace(/\/$/, "");

const mockOrganizations = mockData.ORGS ?? [];

async function fetchBackendJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toView(row: any): OrgView {
  const ins =
    row.ai_insight ??
    (Array.isArray(row.ai_insights) ? row.ai_insights[0] : row.ai_insights);

  const rawReviews = Array.isArray(row.reviews) ? row.reviews : [];
  const publishedReviews = rawReviews.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => !r.status || r.status === "published",
  );

  const reviewCount =
    typeof row.total_reviews === "number"
      ? row.total_reviews
      : publishedReviews.length;

  const rating =
    typeof row.average_rating === "number"
      ? Math.round(row.average_rating * 10) / 10
      : averageRating(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          publishedReviews.map((r: any) => Number(r.rating) || 0),
        );

  const verificationStatus = String(
    row.verification_status ?? row.status ?? "",
  ).toUpperCase();
  const verified =
    Boolean(row.verification?.is_verified) ||
    verificationStatus === "VERIFIED";

  const sentiment = {
    positive: ins?.sentiment_positive ?? 0,
    neutral: ins?.sentiment_neutral ?? 0,
    negative: ins?.sentiment_negative ?? 0,
  };

  const computedTrust =
    typeof row.trust_score === "number"
      ? row.trust_score
      : trustScore({
          rating,
          reviewCount,
          verified,
          positive: sentiment.positive,
        });

  const subInput = row.subscription ?? {};
  const subscription = resolveOrganizationSubscription(
    subInput.plan_tier ?? subInput.tier ?? row.plan_tier ?? row.subscription_tier,
    subInput.status ?? row.subscription_status ?? "ACTIVE",
    subInput.current_period_end ?? row.current_period_end ?? null,
  );

  const verInput = row.verification ?? {};
  const isFaydaVerified = Boolean(
    verInput.is_fayda_verified ?? row.is_fayda_verified,
  );
  const isPhoneVerified = Boolean(
    verInput.is_phone_verified ?? row.is_phone_verified,
  );
  const hasProofOfPurchase = Boolean(
    verInput.has_proof_of_purchase ?? row.has_proof_of_purchase,
  );

  const categoryName =
    typeof row.industry === "object" && row.industry !== null
      ? row.industry.name
      : (row.industry_name ?? row.category ?? "General");

  return {
    id: String(row.id ?? row.slug),
    slug: row.slug || slugify(row.name || String(row.id)),
    name: row.name,
    tagline: row.tagline ?? "",
    description: row.description ?? "",
    category: categoryName,
    services: row.services_summary ?? [],
    industries: row.industries_served ?? row.industries ?? [],
    location: row.location ?? "",
    phone: row.phone || null,
    email: row.email || null,
    website: row.website || null,
    businessHours: row.business_hours || null,
    founded: row.founded ?? null,
    size: row.size ?? "10-50",
    priceTier: row.price_tier ?? 2,
    responseHours: row.response_hours ?? 24,
    certifications: row.certifications ?? [],
    status: verified ? "verified" : (row.status ?? "unverified"),
    ownerId: row.owner_id ?? null,
    verified,
    rating,
    reviewCount,
    trustScore: computedTrust,
    sentiment,
    strengths: ins?.strengths ?? [],
    issues: ins?.weaknesses ?? ins?.issues ?? [],
    aiSummary: ins?.summary ?? "",
    mainComplaint: ins?.main_complaint ?? "",
    recommendation: ins?.overall_consensus ?? ins?.recommendation ?? "",
    satisfactionTrend: satisfactionTrend(publishedReviews),
    logoUrl: row.logo_url || null,
    subscription,
    verification: {
      tier: isFaydaVerified
        ? "FAYDA_VERIFIED"
        : isPhoneVerified
          ? "PHONE_VERIFIED"
          : verified
            ? "VERIFIED_BUYER"
            : "UNVERIFIED",
      isPhoneVerified,
      isFaydaVerified,
      hasProofOfPurchase,
      verifiedAt: verInput.verified_at ?? row.verified_at ?? null,
    },
  };
}

function getMockOrgBySlug(slug: string): OrgView | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const found = (mockOrganizations as any[]).find(
    (o) => o.slug === slug || String(o.id) === slug,
  );
  return found ? toView(found) : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMockReviewsByOrgId(orgId: string): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const standaloneReviews =
    (mockData as any).REVIEWS ?? (mockData as any).reviews ?? [];
  if (Array.isArray(standaloneReviews) && standaloneReviews.length > 0) {
    return standaloneReviews
      .filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) =>
          (r.org_id === orgId || r.orgId === orgId) &&
          (!r.status || r.status === "published"),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any, idx: number) => ({
        ...r,
        id: r.id || `${orgId}-rev-${idx + 1}`,
      }));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = (mockOrganizations as any[]).find(
    (o) => String(o.id) === orgId || o.slug === orgId,
  );
  return (org?.reviews ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((r: any) => !r.status || r.status === "published")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any, idx: number) => ({
      ...r,
      id: r.id || `${orgId}-rev-${idx + 1}`,
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMockServicesByOrgId(orgId: string): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const standaloneServices =
    (mockData as any).SERVICES ?? (mockData as any).services ?? [];
  if (Array.isArray(standaloneServices) && standaloneServices.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return standaloneServices.filter(
      (s: any) => s.org_id === orgId || s.orgId === orgId,
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = (mockOrganizations as any[]).find(
    (o) => String(o.id) === orgId || o.slug === orgId,
  );
  const catalog = org?.service_catalog ?? org?.services_list;
  if (Array.isArray(catalog)) return catalog;

  const summary = org?.services_summary ?? [];
  return summary.map((title: string, idx: number) => ({
    id: `${orgId}-svc-${idx + 1}`,
    org_id: orgId,
    name: title,
    title,
    description: `${title} provided by ${org?.name ?? "this provider"}.`,
    price_tier: org?.price_tier ?? "$$",
  }));
}

export const orgsQuery = () =>
  queryOptions({
    queryKey: ["orgs"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = await fetchBackendJson<{ results?: any[] } | any[]>(
        "/organizations/?page_size=100",
      );
      if (payload) {
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.results)
            ? payload.results
            : [];
        if (items.length > 0) {
          return items.map(toView);
        }
      }
      return mockOrganizations.map(toView);
    },
  });

export const orgQuery = (slug: string) =>
  queryOptions({
    queryKey: ["org", slug],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = await fetchBackendJson<any>(
        `/organizations/${encodeURIComponent(slug)}/`,
      );
      if (payload && payload.id) {
        return toView(payload);
      }
      return getMockOrgBySlug(slug);
    },
  });

export const orgReviewsQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["reviews", orgId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = await fetchBackendJson<{ results?: any[] } | any[]>(
        `/organizations/${encodeURIComponent(orgId)}/reviews/?page_size=50`,
      );
      if (payload) {
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.results)
            ? payload.results
            : [];
        return items.map((r) => ({
          ...r,
          org_id: r.organization_id ?? orgId,
          author_name: r.user_name ?? "Verified Client",
          review_responses: r.provider_response
            ? [
                {
                  body: r.provider_response,
                  updated_at: r.provider_responded_at ?? r.updated_at,
                },
              ]
            : [],
        }));
      }
      return getMockReviewsByOrgId(orgId);
    },
  });

export const servicesQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["services", orgId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = await fetchBackendJson<{ results?: any[] } | any[]>(
        `/organizations/${encodeURIComponent(orgId)}/services/?page_size=50`,
      );
      if (payload) {
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.results)
            ? payload.results
            : [];
        return items.map((s) => ({
          ...s,
          org_id: s.organization_id ?? orgId,
          title: s.name,
        }));
      }
      return getMockServicesByOrgId(orgId);
    },
  });

export async function runSemanticSearch(
  params: SemanticSearchRequest,
): Promise<SemanticSearchMatch[]> {
  const payload = await fetchBackendJson<{ results?: SemanticSearchMatch[] }>(
    "/search/ai/",
    {
      method: "POST",
      body: JSON.stringify({
        query: params.query,
        location: params.location,
        verified_only: params.verifiedOnly ?? false,
        limit: params.limit ?? 10,
      }),
    },
  );
  return payload?.results ?? [];
}

export async function runProviderComparison(
  organizationIds: string[],
  query?: string,
) {
  const payload = await fetchBackendJson<{
    success: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[];
  }>("/comparison/", {
    method: "POST",
    body: JSON.stringify({
      organization_ids: organizationIds,
      ...(query ? { query } : {}),
    }),
  });
  return payload?.data ?? [];
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);