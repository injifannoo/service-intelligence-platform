import { useMutation } from "@tanstack/react-query";
import { compareProviders } from "@/lib/ai.functions";
import { priceLabel, type OrgView } from "@/lib/metrics";
import type { ComparisonSummary } from "../types";

export function toFacts(o: OrgView): string {
  return [
    `Category: ${o.category}`,
    `Trust score: ${o.trustScore}/100, rating ${o.rating.toFixed(1)} from ${o.reviewCount} reviews`,
    `Sentiment: ${o.sentiment.positive}% positive, ${o.sentiment.negative}% negative`,
    `Price: ${priceLabel(o.priceTier)}, response ~${o.responseHours}h, ${o.verified ? "verified" : "not verified"}`,
    `Services: ${o.services.join(", ")}`,
    `Industries: ${o.industries.join(", ")}`,
    o.strengths.length ? `Strengths: ${o.strengths.join("; ")}` : "",
    o.issues.length ? `Issues: ${o.issues.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function useComparisonSummary() {
  return useMutation({
    mutationFn: (orgs: OrgView[]): Promise<ComparisonSummary> =>
      compareProviders({ data: { orgs: orgs.map((o) => ({ name: o.name, facts: toFacts(o) })) } }),
  });
}
