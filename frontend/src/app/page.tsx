import Link from "next/link";
import {
  ArrowRightIcon,
  BarChart3Icon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES, siteConfig } from "@/config/site-config";

const CAPABILITIES = [
  {
    icon: ShieldCheckIcon,
    title: "Verified directory",
    body: "Every provider is identity-checked, so you compare businesses that actually exist.",
  },
  {
    icon: SparklesIcon,
    title: "AI review summaries",
    body: "Hundreds of reviews distilled into strengths and weaknesses, generated asynchronously.",
  },
  {
    icon: BarChart3Icon,
    title: "Side-by-side comparison",
    body: "Weigh rating, price, location, and sentiment on one screen before you commit.",
  },
] as const;

const STEPS = [
  { step: "01", title: "Browse or search", body: "Explore verified providers by industry, rating, and location." },
  { step: "02", title: "Compare side by side", body: "Stack candidates and see the metrics that matter, normalised." },
  { step: "03", title: "Decide with evidence", body: "Use AI review summaries to confirm the trade-offs before you commit." },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-6">
          <Link href={ROUTES.home} className="rounded-lg outline-offset-4 transition-opacity hover:opacity-85">
            <BrandMark />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.login}>Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={ROUTES.register}>Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero. The gradient wash plus a hairline grid gives depth without
            needing imagery, and collapses cleanly on small screens. */}
        <section className="surface-gradient relative overflow-hidden border-b border-border">
          <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:py-28">
            <Badge variant="accent" className="mb-6">
              <SparklesIcon />
              {siteConfig.shortName}
            </Badge>

            <h1 className="max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Choose service providers with evidence, not guesswork.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {siteConfig.description}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href={ROUTES.organizations}>
                  Browse organizations
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={ROUTES.register}>Register a business</Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Free to browse. Verification and AI summaries included.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 py-20">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight">
              Everything you need to shortlist faster
            </h2>
            <p className="text-muted-foreground">
              ASIP turns scattered provider data and customer reviews into a single
              decision surface.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {CAPABILITIES.map((item) => (
              <Card key={item.title} className="group p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <item.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto w-full max-w-7xl px-6 py-20">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
              <p className="text-muted-foreground">
                Three steps from a question to a defensible shortlist.
              </p>
            </div>

            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((item) => (
                <li
                  key={item.step}
                  className="relative rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <span className="text-sm font-semibold text-primary">{item.step}</span>
                  <h3 className="mt-3 font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Closing call to action. */}
        <section className="surface-gradient">
          <div className="mx-auto w-full max-w-7xl px-6 py-20 text-center">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight">
              Stop comparing providers from scattered tabs
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Create an account to save your shortlist, register a business, or
              request verification.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href={ROUTES.register}>
                  Create your account
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={ROUTES.search}>
                  <SearchIcon />
                  Search the directory
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <p className="text-sm text-muted-foreground">
            {siteConfig.name} — MVP v1
          </p>
        </div>
      </footer>
    </div>
  );
}
