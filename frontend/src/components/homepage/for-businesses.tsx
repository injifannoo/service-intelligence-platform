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
      className="scroll-mt-20 border-y border-border bg-[#F5FAFF]"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <div className="relative order-2 lg:order-1">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
            <Image
              src="/assets/business_consultant.png"
              alt="A business consultant presenting insights to a client."
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center"
            />
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            For Businesses
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Grow your business with better insights
          </h2>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">
            Grow your business with better insights, more visibility, and stronger
            customer relationships.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#EEF7FF] text-primary">
                  <CheckIcon className="size-3.5" aria-hidden="true" />
                </span>
                <span className="text-sm text-foreground">{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="mt-9">
            <GrowBusinessCta />
          </div>
        </div>
      </div>
    </section>
  );
}