import Link from "next/link";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CircleCheckIcon,
  MapPinIcon,
  ScaleIcon,
  SearchIcon,
  SparklesIcon,
  StarIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/site-config";

const STEPS = [
  {
    icon: SearchIcon,
    title: "Discover",
    body: "Search for a service using your needs, location, and budget.",
  },
  {
    icon: ScaleIcon,
    title: "Compare",
    body: "Evaluate ratings, verified information, reviews, pricing, and features.",
  },
  {
    icon: CircleCheckIcon,
    title: "Choose",
    body: "Receive personalized recommendations and make an informed decision.",
  },
] as const;

const MATCH_REASONS = [
  "Matches your stated budget range",
  "Wi-Fi and breakfast confirmed",
  "Five minutes from Bole Airport",
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-y border-border bg-background"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-12 sm:py-14 lg:grid-cols-2 lg:gap-12">
        {/* Left: AI recommendation panel with enhanced styling. */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary via-background to-accent/10 p-6 shadow-md sm:p-7">
          <div className="flex items-center gap-3">
            {/* Teal icon — signals AI */}
            <span className="grid size-10 place-items-center rounded-lg bg-accent text-white shadow-sm">
              <SparklesIcon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-bold text-foreground">
              AI-Powered Recommendations
            </h3>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Personalized suggestions based on your preferences and needs.
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs leading-snug text-muted-foreground italic">
              &ldquo;Business hotel near Bole Airport with Wi-Fi and breakfast&rdquo;
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
            <div className="flex items-start gap-3.5">
              <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-sm">
                <StarIcon className="size-5 fill-white" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-base font-bold text-foreground">Skyline Hotel</p>
                  <span className="rounded-full bg-gradient-to-r from-primary to-accent px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    Best Match
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPinIcon className="size-3.5" aria-hidden="true" />
                  Bole, Addis Ababa
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <StarIcon className="size-3.5 fill-gold text-gold" aria-hidden="true" />
                  4.8 <span className="font-normal text-muted-foreground">· 1.2k reviews</span>
                </p>
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {["Free Wi-Fi", "Breakfast", "Near Airport"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary/20"
                >
                  {chip}
                </span>
              ))}
            </div>

            <ul className="mt-3.5 space-y-1.5 border-t border-border pt-3.5">
              {MATCH_REASONS.map((reason) => (
                <li
                  key={reason}
                  className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground"
                >
                  <BadgeCheckIcon className="size-4 text-success" aria-hidden="true" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <Button asChild size="lg" className="mt-5 w-full">
            <Link href={ROUTES.search}>
              Find Your Match
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Right: three connected steps. */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 ring-1 ring-primary/20">
            <p className="text-xs font-bold tracking-wider text-primary uppercase">
              Process
            </p>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            Find the best service in three simple steps.
          </p>

          <ol className="mt-6 space-y-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-sm ring-1 ring-primary/20 transition-transform hover:scale-105">
                    <step.icon className="size-4" aria-hidden="true" />
                  </span>
                  {index < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="mt-3 h-full w-0.5 flex-1 bg-gradient-to-b from-primary/50 to-border"
                    />
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-0.5 text-base font-bold text-foreground">{step.title}</h3>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
