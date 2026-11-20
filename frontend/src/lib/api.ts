import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  averageRating,
  satisfactionTrend,
  trustScore,
  type OrgView,
} from "./metrics";
import * as mockData from "@/lib/data";
import { resolveOrganizationSubscription } from "./tier-limits";

const ORG_SELECT = "*, ai_insights(*), reviews(rating, created_at, status)";
const mockOrganizations = mockData.ORGS ?? [];

const isSupabaseOffline = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !supabaseUrl || supabaseUrl.includes("your-project-ref");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toView(row: any): OrgView {
  const ins = Array.isArray(row.ai_insights)
    ? row.ai_insights[0]
    : row.ai_insights;
  const reviews = (
    (row.reviews ?? []) as {
      rating: number;
      created_at: string;
      status: string;
    }[]
  ).filter((r) => r.status === "published");
  const rating = averageRating(reviews.map((r) => r.rating));
  const verified = row.status === "verified";
  const sentiment = {
    positive: ins?.sentiment_positive ?? 0,
    neutral: ins?.sentiment_neutral ?? 0,
    negative: ins?.sentiment_negative ?? 0,
  };
  return {
    id: row.id ?? row.slug,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    services: row.services_summary ?? [],
    industries: row.industries ?? [],
    location: row.location,
    phone: row.phone,
    email: row.email,
    website: row.website,
    businessHours: row.business_hours,
    founded: row.founded,
    size: row.size,
    priceTier: row.price_tier,
    responseHours: row.response_hours,
    certifications: row.certifications ?? [],
    status: row.status,
    ownerId: row.owner_id,
    verified,
    rating,
    reviewCount: reviews.length,
    trustScore: trustScore({
      rating,
      reviewCount: reviews.length,
      verified,
      positive: sentiment.positive,
    }),
    sentiment,
    strengths: ins?.strengths ?? [],
    issues: ins?.issues ?? [],
    aiSummary: ins?.summary ?? "",
    mainComplaint: ins?.main_complaint ?? "",
    recommendation: ins?.recommendation ?? "",
    satisfactionTrend: satisfactionTrend(reviews),
    logoUrl: row.logo_url ?? null,

    subscription: resolveOrganizationSubscription(
      row.plan_tier ?? row.subscription_tier,
      row.subscription_status ?? "ACTIVE",
      row.current_period_end ?? null,
    ),
    verification: {
      tier: row.is_fayda_verified
        ? "FAYDA_VERIFIED"
        : row.is_phone_verified
          ? "PHONE_VERIFIED"
          : verified
            ? "VERIFIED_BUYER"
            : "UNVERIFIED",
      isPhoneVerified: Boolean(row.is_phone_verified),
      isFaydaVerified: Boolean(row.is_fayda_verified),
      hasProofOfPurchase: Boolean(row.has_proof_of_purchase),
      verifiedAt: row.verified_at ?? null,
    },
  };
}

function getMockOrgBySlug(slug: string): OrgView | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const found = (mockOrganizations as any[]).find(
    (o) => o.slug === slug || o.id === slug,
  );
  return found ? toView(found) : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMockReviewsByOrgId(orgId: string): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const standaloneReviews = (mockData as any).REVIEWS ?? (mockData as any).reviews ?? [];
  if (Array.isArray(standaloneReviews) && standaloneReviews.length > 0) {
    return standaloneReviews
      .filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => (r.org_id === orgId || r.orgId === orgId) && (!r.status || r.status === "published"),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any, idx: number) => ({
        ...r,
        id: r.id || `${orgId}-rev-${idx + 1}`,
      }));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = (mockOrganizations as any[]).find((o) => o.id === orgId || o.slug === orgId);
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
    (o) => o.id === orgId || o.slug === orgId,
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
      if (isSupabaseOffline()) {
        return mockOrganizations.map(toView);
      }

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select(ORG_SELECT)
          .order("name", { ascending: true });

        if (error || !data) {
          console.warn(
            "[orgsQuery] Supabase request failed, using mockOrganizations:",
            error,
          );
          return mockOrganizations.map(toView);
        }

        return data.map(toView);
      } catch (err) {
        console.warn(
          "[orgsQuery] Supabase offline, using mockOrganizations:",
          err,
        );
        return mockOrganizations.map(toView);
      }
    },
  });

export const orgQuery = (slug: string) =>
  queryOptions({
    queryKey: ["org", slug],
    queryFn: async () => {
      if (isSupabaseOffline()) {
        return getMockOrgBySlug(slug);
      }

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select(ORG_SELECT)
          .eq("slug", slug)
          .maybeSingle();

        if (error) {
          console.warn(
            `[orgQuery] Supabase request failed for "${slug}", using mock:`,
            error,
          );
          return getMockOrgBySlug(slug);
        }
        return data ? toView(data) : getMockOrgBySlug(slug);
      } catch (err) {
        console.warn(
          `[orgQuery] Supabase offline for "${slug}", using mock:`,
          err,
        );
        return getMockOrgBySlug(slug);
      }
    },
  });

export const orgReviewsQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["reviews", orgId],
    queryFn: async () => {
      if (isSupabaseOffline()) {
        return getMockReviewsByOrgId(orgId);
      }

      try {
        const { data, error } = await supabase
          .from("reviews")
          .select("*, review_responses(body, updated_at, author_id)")
          .eq("org_id", orgId)
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn(
            `[orgReviewsQuery] Supabase failed for org "${orgId}", using mock:`,
            error,
          );
          return getMockReviewsByOrgId(orgId);
        }
        return data ?? [];
      } catch (err) {
        console.warn(
          `[orgReviewsQuery] Supabase offline for org "${orgId}", using mock:`,
          err,
        );
        return getMockReviewsByOrgId(orgId);
      }
    },
  });

export const servicesQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["services", orgId],
    queryFn: async () => {
      if (isSupabaseOffline()) {
        return getMockServicesByOrgId(orgId);
      }

      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("org_id", orgId)
          .order("created_at");

        if (error) {
          console.warn(
            `[servicesQuery] Supabase failed for org "${orgId}", using mock:`,
            error,
          );
          return getMockServicesByOrgId(orgId);
        }
        return data ?? [];
      } catch (err) {
        console.warn(
          `[servicesQuery] Supabase offline for org "${orgId}", using mock:`,
          err,
        );
        return getMockServicesByOrgId(orgId);
      }
    },
  });

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
