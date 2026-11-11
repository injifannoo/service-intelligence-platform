import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { averageRating, satisfactionTrend, trustScore, type OrgView } from "./metrics";
import { ORGS as mockOrganizations } from "@/lib/data";

const ORG_SELECT = "*, ai_insights(*), reviews(rating, created_at, status)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toView(row: any): OrgView {
  const ins = Array.isArray(row.ai_insights) ? row.ai_insights[0] : row.ai_insights;
  const reviews = (
    (row.reviews ?? []) as { rating: number; created_at: string; status: string }[]
  ).filter((r) => r.status === "published");
  const rating = averageRating(reviews.map((r) => r.rating));
  const verified = row.status === "verified";
  const sentiment = {
    positive: ins?.sentiment_positive ?? 0,
    neutral: ins?.sentiment_neutral ?? 0,
    negative: ins?.sentiment_negative ?? 0,
  };
  return {
    id: row.id,
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
  };
}

export const orgsQuery = () =>
  queryOptions({
    queryKey: ["orgs"],
    queryFn: async () => {
      // If Supabase URL is placeholder or unconfigured, return mock data directly
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      if (!supabaseUrl || supabaseUrl.includes("your-project-ref")) {
        return mockOrganizations.map(toView);
      }

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("*, ai_insights(*), reviews(rating, created_at, status)")
          .order("name", { ascending: true });

        if (error || !data) {
          console.warn("[orgsQuery] Supabase request failed, using mockOrganizations:", error);
          return mockOrganizations.map(toView);
        }

        return data.map(toView);
      } catch (err) {
        console.warn("[orgsQuery] Supabase offline, using mockOrganizations:", err);
        return mockOrganizations.map(toView);
      }
    },
  });

export const orgQuery = (slug: string) =>
  queryOptions({
    queryKey: ["org", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(ORG_SELECT)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data ? toView(data) : null;
    },
  });

export const orgReviewsQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["reviews", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, review_responses(body, updated_at, author_id)")
        .eq("org_id", orgId)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const servicesQuery = (orgId: string) =>
  queryOptions({
    queryKey: ["services", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
