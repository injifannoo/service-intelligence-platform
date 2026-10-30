import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/site-config";

import { JoinBusinessCta } from "./business-cta";

export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-10 sm:pb-12">
      <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-9 text-center text-white sm:px-12 sm:py-11">
        {/* Teal orb top-right */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-accent/30 blur-3xl"
        />
        {/* Gold orb bottom-left */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-16 size-72 rounded-full bg-gold/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-2xl">
          <p className="text-xs font-bold tracking-wider text-white/70 uppercase">
            Get Started
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Make Smarter Decisions
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/85">
            Discover trusted providers and find services that fit your needs.
          </p>
          <div className="cta-inverse mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href={ROUTES.organizations}>
                Explore Services
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <JoinBusinessCta />
          </div>
          <p className="mt-6 text-sm text-white/70">
            Free to browse. No account required.
          </p>
        </div>
      </div>
    </section>
  );
}
