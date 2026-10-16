import Image from "next/image";
import { CheckIcon } from "lucide-react";

import { GrowBusinessCta } from "./business-cta";

const BENEFITS = [
  "Improve digital visibility",
  "Understand customer feedback",
  "Monitor reputation and sentiment",
  "Identify recurring complaints",
  "Track performance with analytics",
  "Build customer trust",
] as const;

export function ForBusinesses() {
  return (
    <section
      id="for-businesses"
      className="scroll-mt-20 border-y border-border bg-secondary"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-6 py-14 sm:py-16 lg:grid-cols-2 lg:gap-14">
        <div className="relative order-2 lg:order-1">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border-2 border-border/60 bg-card shadow-xl ring-1 ring-black/5">
            <Image
              src="/assets/business_consultant.png"
              alt="Business consultant presenting insights to a client."
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center"
            />
          </div>
          {/* Teal glow */}
          <div className="absolute -inset-4 -z-10 bg-gradient-to-br from-accent/20 via-primary/10 to-transparent blur-3xl opacity-50" />
        </div>

        <div className="order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 ring-1 ring-primary/20">
            <p className="text-xs font-bold tracking-wider text-primary uppercase">
              For Businesses
            </p>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Grow with Better Insights
          </h2>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Increase visibility and build stronger customer relationships.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                  <CheckIcon className="size-3.5" aria-hidden="true" />
                </span>
                <span className="text-sm text-foreground">{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <GrowBusinessCta />
          </div>
        </div>
      </div>
    </section>
  );
}