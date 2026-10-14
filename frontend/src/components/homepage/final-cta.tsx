import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/site-config";

import { JoinBusinessCta } from "./business-cta";

export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-12 sm:pb-14">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-10 text-center text-white shadow-xl sm:px-12 sm:py-12">
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
          <h2 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Make Smarter Decisions
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/85">
            Discover trusted providers and find services that fit your needs.
          </p>
          <div className="cta-inverse mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href={ROUTES.organizations}>
                Explore Services
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <JoinBusinessCta />
          </div>
        </div>
      </div>
    </section>
  );
}
