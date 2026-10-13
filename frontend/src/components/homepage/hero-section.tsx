import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  BarChart3Icon,
  ScaleIcon,
  ShieldCheckIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/site-config";
import { cn } from "@/lib/utils";

import { HeroSearch } from "./hero-search";

/** Soft tinted icon chips: colour is used sparingly to separate categories. */
const FEATURES = [
  { icon: ShieldCheckIcon, label: "Verified Information", tone: "bg-[#EEF7FF] text-[#0866F5]" },
  { icon: StarIcon, label: "Real Customer Reviews", tone: "bg-[#F3EDFF] text-[#8B5CF6]" },
  { icon: ScaleIcon, label: "AI-Powered Comparison", tone: "bg-[#E6FBF8] text-[#14B8A6]" },
  { icon: UsersIcon, label: "Personalized Recommendations", tone: "bg-[#FFF4E5] text-[#F59E0B]" },
  { icon: BarChart3Icon, label: "Business Intelligence", tone: "bg-[#EEF7FF] text-[#0866F5]" },
] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border surface-gradient">
      <div
        aria-hidden="true"
        className="hero-grid pointer-events-none absolute inset-0 opacity-60"
      />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-24">
        {/* Left: message, search, capabilities, actions. */}
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            AI-Powered System Intelligent Platform
          </p>

          <h1 className="mt-5 text-4xl leading-[1.08] font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
            Find, Compare &amp; Choose
            <br />
            <span className="text-primary">the Best Services.</span>
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Trusted information. Real customer feedback. AI-powered recommendations.
            All in one place.
          </p>

          <div className="mt-8 max-w-xl">
            <HeroSearch />
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {FEATURES.map((feature) => (
              <li key={feature.label} className="flex flex-col items-start gap-2">
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl",
                    feature.tone,
                  )}
                >
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-xs leading-snug font-medium text-foreground">
                  {feature.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={ROUTES.organizations}>
                Explore Services
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#for-businesses">For Businesses</a>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Free to browse. No account required to compare providers.
          </p>
        </div>

        {/* Right: professional photo. */}
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-border bg-card shadow-lg">
            <Image
              src="/assets/hero.png"
              alt="A professional Ethiopian woman working on a laptop in a bright modern office."
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className="object-cover object-center"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
