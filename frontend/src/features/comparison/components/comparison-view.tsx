"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Page, Stars, Loading } from "@/components/shared/site";
import { getOrganizations } from "@/features/organizations";
import { AiComparisonSummary } from "@/features/comparison";
import { priceLabel, type OrgView } from "@/lib/metrics";

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
  const { data, isLoading } = useQuery(getOrganizations());
  const selected = ids.split(",").filter(Boolean);
  const orgs = selected.map((s) => data?.find((o) => o.slug === s)).filter(Boolean) as OrgView[];
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
        {orgs.length < 2 ? (
          <p className="mt-16 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            Select at least two providers to compare.
          </p>
        ) : (
          <div className="mt-10 overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-4" />
                  {orgs.map((o) => (
                    <th key={o.id} className="p-4 text-left">
                      <Link
                        href={`/organizations/${o.slug}`}
                        className="font-display text-xl hover:text-primary"
                      >
                        {o.name}
                      </Link>
                      <p className="font-normal text-muted-foreground">{o.category}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, render, val]) => {
                  const best = val ? Math.max(...orgs.map(val)) : null;
                  return (
                    <tr key={label} className="border-b">
                      <td className="p-4 text-muted-foreground">{label}</td>
                      {orgs.map((o) => (
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
                  {orgs.map((o) => (
                    <td key={o.id} className="p-4 align-top text-muted-foreground">
                      {o.aiSummary || "Not enough reviews yet."}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {orgs.length >= 2 && <AiComparisonSummary orgs={orgs} />}
      </div>
    </Page>
  );
}
