"use client"
import Link from "next/link";
import {useRouter} from "next/navigation";

import { useState } from "react";
import { Page, Bar } from "@/components/shared/site";

const SECTORS = [
  {
    name: "Healthcare",
    icon: "✚",
    blurb: "Hospitals, clinics, labs and pharmacies.",
    state: "soon",
  },
  { name: "Hotels", icon: "⌂", blurb: "Hotels, lodges and guest houses.", state: "soon" },
  { name: "Restaurants", icon: "☕", blurb: "Restaurants, cafés and catering.", state: "soon" },
  {
    name: "Education",
    icon: "✎",
    blurb: "Universities, schools and training centers.",
    state: "soon",
  },
  {
    name: "Software and IT Services",
    icon: "⌘",
    blurb: "Developers, cloud, security, design, data and digital marketing.",
    state: "live",
  },
  {
    name: "Financial Services",
    icon: "¤",
    blurb: "Banks, microfinance and insurance.",
    state: "soon",
  },
  {
    name: "Home and Professional Services",
    icon: "⚒",
    blurb: "Legal, accounting, repairs and cleaning.",
    state: "soon",
  },
  {
    name: "Other Services",
    icon: "✦",
    blurb: "Everything currently listed on ASIP.",
    state: "all",
  },
] as const;

const EXAMPLES = [
  "Affordable software company for a fintech startup",
  "Penetration testing for a bank, verified only",
  "Fast mobile app MVP on a startup budget",
];

export function HomeView() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const go = (query: string) => router.push(`/search?q=${encodeURIComponent(query)}`);
  const featured = {
    name: "Lucy Cloud Systems",
    positive: 74,
    recommendation: "Reduce average quotation response time from 48 hours to 12 hours.",
  };

  return (
    <Page>
      <section className="bg-ink-gradient text-ink-foreground">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-[1.2fr_1fr] lg:py-32">
          <div>
            <p className="eyebrow text-accent">Service intelligence · Addis Ababa</p>
            <h1 className="mt-6 text-5xl leading-[1.05] md:text-7xl">
              Choose service providers on <em className="text-accent">evidence</em>, not guesswork.
            </h1>
            <p className="mt-6 max-w-xl text-lg opacity-80">
              Describe what you need in plain language. ASIP reads verified reviews, credentials and
              performance data, then tells you who fits — and why.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                go(q);
              }}
              className="mt-10 flex max-w-xl gap-2 rounded-lg bg-card p-2 text-card-foreground shadow-card"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. Which company can build a fintech app under budget?"
                className="flex-1 bg-transparent px-3 text-sm outline-none"
              />
              <button className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-accent-foreground">
                Ask
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  onClick={() => go(e)}
                  className="rounded-full border border-ink-foreground/20 px-3 py-1 text-xs opacity-80 hover:opacity-100"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="self-center rounded-xl bg-card p-6 text-card-foreground shadow-card">
            <p className="eyebrow text-muted-foreground">AI insight · live example</p>
            <h3 className="mt-2 text-2xl">{featured.name}</h3>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Customer sentiment</span>
                <span className="font-medium text-success">Positive, {featured.positive}%</span>
              </div>
              <Bar value={featured.positive} tone="success" />
              <div className="flex justify-between pt-2">
                <span>Main complaint</span>
                <span className="font-medium">Slow quotation response</span>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="eyebrow text-primary">Recommendation</p>
                <p className="mt-1">{featured.recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-3">
          {[
            [
              "01",
              "Discover",
              "Natural-language search understands budget, industry, urgency and trust requirements.",
            ],
            [
              "02",
              "Evaluate",
              "AI summarizes thousands of verified reviews into strengths, issues and a trust score.",
            ],
            [
              "03",
              "Improve",
              "Organizations see sentiment trends, benchmarks and concrete next actions.",
            ],
          ].map(([n, t, d]) => (
            <div key={n} className="border-t pt-6">
              <span className="font-mono text-sm text-muted-foreground">{n}</span>
              <h3 className="mt-3 text-3xl">{t}</h3>
              <p className="mt-3 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="eyebrow text-primary">Industry rollout</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <h2 className="text-4xl md:text-5xl">Phase categories</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              We launch one industry at a time to guarantee data quality. Software and IT is live
              today across Addis Ababa.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SECTORS.map((c) => {
              const live = c.state === "live";
              const all = c.state === "all";
              const inner = (
                <>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl" aria-hidden>
                      {c.icon}
                    </span>
                    <span
                      className={`eyebrow rounded-full px-2 py-1 text-[0.6rem] ${live ? "bg-accent text-accent-foreground" : all ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {live ? "● Live" : all ? "All" : "Coming soon"}
                    </span>
                  </div>
                  <p className="mt-8 font-display text-2xl leading-tight">{c.name}</p>
                  <p className="mt-2 text-sm opacity-75">{c.blurb}</p>
                  <p className={`mt-6 text-sm font-medium ${live || all ? "" : "opacity-50"}`}>
                    {live ? "Explore →" : all ? "Browse all →" : "Launching later"}
                  </p>
                </>
              );
              return live || all ? (
                <Link
                  key={c.name}
                  href="/search"
                  className={`group flex flex-col rounded-xl border p-6 transition-all hover:-translate-y-1 hover:shadow-card ${live ? "bg-ink-gradient text-ink-foreground" : "bg-background"}`}
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={c.name}
                  aria-disabled
                  className="flex flex-col rounded-xl border border-dashed bg-background p-6 text-muted-foreground"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-24 md:grid-cols-2">
        <div>
          <p className="eyebrow text-primary">The difference</p>
          <h2 className="mt-4 text-4xl">
            A directory stores a phone number. ASIP stores intelligence.
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border p-5">
            <p className="eyebrow text-muted-foreground">Traditional</p>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              <li>Name</li>
              <li>Address</li>
              <li>Phone</li>
              <li>Category</li>
            </ul>
          </div>
          <div className="rounded-lg bg-primary p-5 text-primary-foreground">
            <p className="eyebrow opacity-70">ASIP</p>
            <ul className="mt-3 space-y-1">
              <li>Verified reviews</li>
              <li>Sentiment & trust score</li>
              <li>Strengths & issues</li>
              <li>Benchmarks & AI advice</li>
            </ul>
          </div>
        </div>
      </section>
    </Page>
  );
}
