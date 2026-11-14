/** Pure scoring helpers shared by search, comparison and dashboards. */
import type { OrganizationSubscription, TrustVerificationBadge } from "@/types/platform-contracts";

export type OrgView = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  services: string[];
  industries: string[];
  location: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  businessHours: string | null;
  founded: number | null;
  size: string;
  priceTier: number;
  responseHours: number;
  certifications: string[];
  status: string;
  ownerId: string | null;
  verified: boolean;
  rating: number;
  reviewCount: number;
  trustScore: number;
  sentiment: { positive: number; neutral: number; negative: number };
  strengths: string[];
  issues: string[];
  aiSummary: string;
  mainComplaint: string;
  recommendation: string;
  satisfactionTrend: number[];
  logoUrl: string | null;
  subscription?: OrganizationSubscription;
  verification?: TrustVerificationBadge;
};

export function averageRating(ratings: number[]) {
  if (!ratings.length) return 0;
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
}

/**
 * Trust score (0-100): rating quality 55, verification 15,
 * review volume 15 (saturates at 40 reviews), positive sentiment 15.
 */
export function trustScore(input: {
  rating: number;
  reviewCount: number;
  verified: boolean;
  positive: number;
}) {
  if (input.reviewCount === 0) return input.verified ? 40 : 25;
  const s =
    (input.rating / 5) * 55 +
    (input.verified ? 15 : 0) +
    (Math.min(input.reviewCount, 40) / 40) * 15 +
    (input.positive / 100) * 15;
  return Math.round(Math.min(100, s));
}

/** Monthly average rating converted to a 0-100 satisfaction index, last N months. */
export function satisfactionTrend(
  reviews: { rating: number; created_at: string }[],
  months = 7,
  now = new Date(),
) {
  const out: number[] = [];
  let last = 0;
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = reviews.filter((r) => {
      const c = new Date(r.created_at);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    });
    if (m.length) last = Math.round((averageRating(m.map((r) => r.rating)) / 5) * 100);
    out.push(last);
  }
  const first = out.find((v) => v > 0) ?? 0;
  return out.map((v) => v || first);
}

export const priceLabel = (t: number) => ["", "Affordable", "Mid-range", "Premium"][t] ?? "—";
export const priceSymbol = (t: number) => "$".repeat(Math.max(1, t));

export const CRITERIA = [
  ["rating_technical", "Technical quality"],
  ["rating_communication", "Communication"],
  ["rating_delivery", "On-time delivery"],
  ["rating_value", "Value for money"],
] as const;
export type CriterionKey = (typeof CRITERIA)[number][0];

/** Average of each optional sub-rating across reviews (null when nobody rated it). */
export function criteriaAverages(reviews: Partial<Record<CriterionKey, number | null>>[]) {
  const out = {} as Record<CriterionKey, number | null>;
  for (const [k] of CRITERIA) {
    const v = reviews.map((r) => r[k]).filter((x): x is number => typeof x === "number");
    out[k] = v.length ? averageRating(v) : null;
  }
  return out;
}
