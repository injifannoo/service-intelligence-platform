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
      className="scroll-mt-20 border-y border-border bg-white"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-14">
        {/* Left: three connected steps. */}
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Process
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            Get the best service in just a few simple steps.
          </p>

          <ol className="mt-10 space-y-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  {index < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="mt-2 h-full w-px flex-1 bg-border"
                    />
                  )}
                </div>
                <div className="pb-2">
                  <p className="text-xs font-semibold text-primary">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-0.5 font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Right: AI recommendation panel. */}
        <div className="rounded-3xl border border-border bg-[#F5FAFF] p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <SparklesIcon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-semibold text-foreground">
              AI-Powered Recommendations
            </h3>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Get personalized service suggestions based on your preferences, location,
            budget, and needs.
          </p>

          <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-xs">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs leading-snug text-muted-foreground">
              &ldquo;Find a reliable business hotel near Bole Airport with strong Wi-Fi
              and breakfast included.&rdquo;
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0B74FF] to-[#14B8A6] text-white">
                <StarIcon className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-foreground">Skyline Hotel</p>
                  <span className="rounded-full bg-[#EEF7FF] px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Best Match
                  </span>
                </div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPinIcon className="size-3" aria-hidden="true" />
                  Bole, Addis Ababa
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-foreground">
                  <StarIcon className="size-3 fill-warning text-warning" aria-hidden="true" />
                  4.8 <span className="font-normal text-muted-foreground">· 1.2k reviews</span>
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Free Wi-Fi", "Breakfast", "Near Airport"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-[#EEF7FF] px-2.5 py-0.5 text-[11px] font-medium text-primary"
                >
                  {chip}
                </span>
              ))}
            </div>

            <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
              {MATCH_REASONS.map((reason) => (
                <li
                  key={reason}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <BadgeCheckIcon className="size-3.5 text-success" aria-hidden="true" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <Button asChild size="lg" className="mt-5 w-full">
            <Link href={ROUTES.search}>
              Find Your Best Match
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Illustrative example with demo data.
          </p>
        </div>
      </div>
    </section>
  );
}
