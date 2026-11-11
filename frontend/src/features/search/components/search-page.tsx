"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page, Stars, TrustBadge, Loading, inputCls } from "@/components/shared/site";
import { matchPercent, type Intent } from "@/lib/search";
import { interpretLocally, smartRank } from "../api/smart-search";
import { getOrganizations } from "@/features/organizations";
import { priceLabel } from "@/lib/metrics";
import { CATEGORIES } from "@/lib/data";
import { understandQuery } from "@/lib/ai.functions";

export function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const router = useRouter();

  const [input, setInput] = useState(q);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [verified, setVerified] = useState(false);
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [location, setLocation] = useState("");
  const orgs = useQuery(getOrganizations());
  
  const ai = useQuery({
    queryKey: ["intent", q],
    queryFn: () => understandQuery({ data: { q } }),
    enabled: aiEnabled && !!q.trim(),
    retry: false,
    staleTime: Infinity,
  });

  const intent: Intent = useMemo(() => {
    const local = interpretLocally(q);
    const a = aiEnabled ? ai.data : null;
    if (!a) return local;
    return {
      ...local,
      categories: [...new Set([...local.categories, ...a.categories])],
      industries: [...new Set([...local.industries, ...a.industries])],
      budget: (a.budget || local.budget || undefined) as Intent["budget"],
      fastResponse: local.fastResponse || a.fastResponse,
      verifiedOnly: local.verifiedOnly || a.verifiedOnly,
    };
  }, [q, ai.data, aiEnabled]);

  const results = useMemo(() => {
    let list = orgs.data ?? [];
    if (category) list = list.filter((o) => o.category === category);
    if (price) list = list.filter((o) => o.priceTier === price);
    if (location)
      list = list.filter((o) => o.location.toLowerCase().includes(location.toLowerCase()));
    const v = verified || intent.verifiedOnly;
    if (v) list = list.filter((o) => o.verified);
    return smartRank(intent, list);
  }, [orgs.data, intent, verified, category, price, location]);

  const chips = [
    ...intent.categories,
    ...intent.industries.map((i) => `Industry: ${i}`),
    intent.budget === 1 && "Budget: affordable",
    intent.budget === 2 && "Budget: mid-range",
    intent.budget === 3 && "Budget: premium",
    intent.fastResponse && "Fast response",
    intent.verifiedOnly && "Verified only",
  ].filter(Boolean) as string[];

  return (
    <Page>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="eyebrow text-primary">Software and IT Services · Addis Ababa</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/search?q=${encodeURIComponent(input)}`);
          }}
          className="mt-4 flex gap-2 rounded-lg border bg-card p-2 shadow-card"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you need, e.g. affordable team to build a fintech app…"
            aria-label="Service search"
            className="min-w-0 flex-1 bg-transparent px-3 outline-none"
          />
          <Button type="submit">
            <Search aria-hidden="true" />
            Search
          </Button>
        </form>

        <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(e) => setAiEnabled(e.target.checked)}
          />
          AI interpretation
        </label>
        {q && (
          <div className="mt-4 rounded-md bg-muted p-4 text-sm">
            <span className="eyebrow mr-2 text-primary">Search criteria</span>
            {aiEnabled && ai.isFetching
              ? "Analyzing your request…"
              : aiEnabled && ai.data?.explanation
                ? ai.data.explanation
                : q}
            {aiEnabled && ai.isError && (
              <p role="alert" className="mt-2 text-destructive">
                AI interpretation is unavailable. Local results are shown.
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {chips.map((c) => (
                <span key={c} className="rounded-full bg-card px-3 py-1">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-3 text-sm md:grid-cols-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className={inputCls}
          >
            <option value={0}>Any price</option>
            <option value={1}>Affordable</option>
            <option value={2}>Mid-range</option>
            <option value={3}>Premium</option>
          </select>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (e.g. Bole)"
            className={inputCls}
          />
          <label className="flex items-center gap-2 rounded-md border px-3">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
            />{" "}
            Verified only
          </label>
        </div>

        {orgs.isLoading ? (
          <Loading />
        ) : (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-muted-foreground">{results.length} providers</p>
            {results.length === 0 && (
              <p className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                No providers match. Try removing a filter.
              </p>
            )}
            {results.map((r, i) => (
              <article
                key={r.org.id}
                className="grid gap-6 rounded-lg border bg-card p-6 shadow-card md:grid-cols-[auto_1fr_auto]"
              >
                <TrustBadge score={r.org.trustScore} />
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    {i === 0 && q && (
                      <span className="eyebrow rounded bg-accent px-2 py-0.5 text-accent-foreground">
                        Best match
                      </span>
                    )}
                    <Link
                      href={`/organizations/${r.org.slug}`}
                      className="font-display text-2xl hover:text-primary"
                    >
                      {r.org.name}
                    </Link>
                    {r.org.verified ? (
                      <span className="text-xs text-success">✓ Verified</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Verification pending</span>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground">{r.org.tagline}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                    <Stars value={r.org.rating} />
                    <span>{r.org.reviewCount} reviews</span>
                    <span>{r.org.location}</span>
                    <span>{priceLabel(r.org.priceTier)}</span>
                    <span>~{r.org.responseHours}h response</span>
                  </div>
                  <ul className="mt-4 flex flex-wrap gap-2 text-xs">
                    {r.reasons.map((x) => (
                      <li
                        key={x}
                        className="rounded border border-primary/30 bg-primary/5 px-2 py-1 text-primary"
                      >
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right">
                  {q && (
                    <>
                      <p className="font-display text-3xl">{matchPercent(results, r)}%</p>
                      <p className="eyebrow text-muted-foreground">match</p>
                    </>
                  )}
                  <Link
                    href={`/compare?ids=${encodeURIComponent([...new Set([results[0]?.org.slug ?? r.org.slug, r.org.slug])].join(","))}`}
                    className="mt-3 inline-block text-sm text-primary hover:underline"
                  >
                    Compare
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
