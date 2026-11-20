"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { Page, Stars, Loading, inputCls } from "@/components/shared/site";
import { getOrganizations } from "@/features/organizations";
import { AiComparisonSummary } from "@/features/comparison";
import { runProviderComparison } from "@/lib/api";
import { priceLabel, type OrgView } from "@/lib/metrics";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ROWS: [string, (o: OrgView) => ReactNode, ((o: OrgView) => number) | null][] = [
  ["AI trust score", (o) => o.trustScore, (o) => o.trustScore],
  ["Rating", (o) => <Stars value={o.rating} />, (o) => o.rating],
  ["Reviews", (o) => o.reviewCount, (o) => o.reviewCount],
  ["Positive sentiment", (o) => `${o.sentiment.positive}%`, (o) => o.sentiment.positive],
  ["Price", (o) => priceLabel(o.priceTier), (o) => -o.priceTier],
  ["Response time", (o) => `~${o.responseHours}h`, (o) => -o.responseHours],
  ["Location", (o) => o.location, null],
  ["Services", (o) => o.services.join(", "), null],
  ["Verified", (o) => (o.verified ? "✓ Yes" : "Pending"), (o) => (o.verified ? 1 : 0)],
];

export function ComparisonView() {
  const searchParams = useSearchParams();
  const ids = searchParams.get("ids") ?? "";
  const router = useRouter();
  const [requirement, setRequirement] = useState("");
  const { data, isLoading } = useQuery(getOrganizations());

  const selected = useMemo(() => ids.split(",").filter(Boolean), [ids]);
  const orgs = useMemo(
    () =>
      selected
        .map((s) => data?.find((o) => o.slug === s || o.id === s))
        .filter(Boolean) as OrgView[],
    [selected, data],
  );

  const backendUuids = useMemo(
    () => orgs.map((o) => o.id).filter((id) => UUID_REGEX.test(id)),
    [orgs],
  );

  const comparisonMatrixQuery = useQuery({
    queryKey: ["comparison-matrix", backendUuids, requirement.trim()],
    queryFn: () =>
      runProviderComparison(backendUuids, requirement.trim() || undefined),
    enabled: backendUuids.length >= 2,
    staleTime: 60_000,
  });

  const matrixByOrgId = useMemo(() => {
    const entries = comparisonMatrixQuery.data ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Map<string, any>(
      entries.map((item) => [String(item.organization_id), item]),
    );
  }, [comparisonMatrixQuery.data]);

  const enrichedOrgs = useMemo(() => {
    if (matrixByOrgId.size === 0) return orgs;
    return orgs.map((o) => {
      const m = matrixByOrgId.get(o.id);
      if (!m) return o;
      return {
        ...o,
        trustScore: typeof m.trust_score === "number" ? m.trust_score : o.trustScore,
        rating: typeof m.average_rating === "number" ? m.average_rating : o.rating,
        reviewCount: typeof m.total_reviews === "number" ? m.total_reviews : o.reviewCount,
        sentiment: {
          ...o.sentiment,
          positive:
            typeof m.ai_sentiment_index === "number"
              ? Math.round(m.ai_sentiment_index)
              : o.sentiment.positive,
        },
        aiSummary: m.ai_summary || o.aiSummary,
        recommendation: m.overall_consensus || o.recommendation,
        strengths: Array.isArray(m.strengths) && m.strengths.length ? m.strengths : o.strengths,
        issues: Array.isArray(m.weaknesses) && m.weaknesses.length ? m.weaknesses : o.issues,
      };
    });
  }, [orgs, matrixByOrgId]);

  const toggle = (slug: string) => {
    const next = selected.includes(slug)
      ? selected.filter((s) => s !== slug)
      : [...selected, slug].slice(-4);
    router.push(`/compare?ids=${encodeURIComponent(next.join(","))}`);
  };

  return (
    <Page>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-5xl">Compare providers</h1>
        <p className="mt-2 text-muted-foreground">
          Pick up to four. The best value in each row is highlighted.
        </p>

        <div className="mt-6 max-w-2xl">
          <label className="block text-sm font-medium text-muted-foreground">
            Project requirement (optional — enables AI recommendation ranking)
          </label>
          <input
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="e.g. Need an ISO-certified fintech partner in Addis Ababa with fast delivery"
            className={`mt-1.5 ${inputCls}`}
          />
        </div>

        {isLoading ? (
          <Loading />
        ) : (
          <div className="mt-6 flex flex-wrap gap-2">
            {data?.map((o) => (
              <button
                key={o.id}
                onClick={() => toggle(o.slug)}
                className={`rounded-full border px-3 py-1 text-sm ${selected.includes(o.slug) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {o.name}
              </button>
            ))}
          </div>
        )}
        {enrichedOrgs.length < 2 ? (
          <p className="mt-16 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            Select at least two providers to compare.
          </p>
        ) : (
          <div className="mt-10 overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-4" />
                  {enrichedOrgs.map((o) => {
                    const rec = matrixByOrgId.get(o.id)?.ai_recommendation;
                    return (
                      <th key={o.id} className="p-4 text-left">
                        {rec?.is_recommended && (
                          <span className="eyebrow mb-1 inline-block rounded bg-accent px-2 py-0.5 text-accent-foreground">
                            AI Top Pick{rec.match_score ? ` · ${Math.round(rec.match_score)}%` : ""}
                          </span>
                        )}
                        <div>
                          <Link
                            href={`/organizations/${o.slug}`}
                            className="font-display text-xl hover:text-primary"
                          >
                            {o.name}
                          </Link>
                        </div>
                        <p className="font-normal text-muted-foreground">{o.category}</p>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, render, val]) => {
                  const best = val ? Math.max(...enrichedOrgs.map(val)) : null;
                  return (
                    <tr key={label} className="border-b">
                      <td className="p-4 text-muted-foreground">{label}</td>
                      {enrichedOrgs.map((o) => (
                        <td
                          key={o.id}
                          className={`p-4 ${val && val(o) === best ? "bg-primary/5 font-medium text-primary" : ""}`}
                        >
                          {render(o)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr>
                  <td className="p-4 align-top text-muted-foreground">AI verdict</td>
                  {enrichedOrgs.map((o) => (
                    <td key={o.id} className="p-4 align-top text-muted-foreground">
                      {o.aiSummary || "Not enough reviews yet."}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {enrichedOrgs.length >= 2 && <AiComparisonSummary orgs={enrichedOrgs} />}
      </div>
    </Page>
  );
}