import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/site-config";

import { JoinBusinessCta } from "./business-cta";

export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 sm:pb-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0875FF] to-[#0755E8] px-6 py-14 text-center text-white shadow-lg sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-white/10 blur-2xl"
        />

        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Make Smarter Service Decisions.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/85">
            Discover trusted providers, compare your options, and find the services
            that fit your needs.
          </p>
          <div className="cta-inverse mt-8 flex flex-wrap justify-center gap-3">
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
