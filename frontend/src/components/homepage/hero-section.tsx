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

/** Feature chips aligned to ASIP brand palette */
const FEATURES = [
  { icon: ShieldCheckIcon,  label: "Verified Information",        tone: "bg-primary/10 text-primary ring-1 ring-primary/20" },
  { icon: StarIcon,         label: "Real Customer Reviews",       tone: "bg-gold/15 text-[#9a6f00] ring-1 ring-gold/30" },
  { icon: ScaleIcon,        label: "AI-Powered Comparison",       tone: "bg-accent/10 text-accent ring-1 ring-accent/20" },
  { icon: UsersIcon,        label: "Personalized Recommendations",tone: "bg-primary/10 text-primary ring-1 ring-primary/20" },
  { icon: BarChart3Icon,    label: "Business Intelligence",       tone: "bg-accent/10 text-accent ring-1 ring-accent/20" },
] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border surface-gradient">
      <div
        aria-hidden="true"
        className="hero-grid pointer-events-none absolute inset-0 opacity-50"
      />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-6 py-14 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
        {/* Left: message, search, capabilities, actions. */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 ring-1 ring-primary/20">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-primary"></span>
            </span>
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              AI-Powered Platform
            </p>
          </div>

          <h1 className="mt-6 text-5xl leading-[1.08] font-bold tracking-tight text-foreground sm:text-6xl lg:text-[4rem]">
            Find, Compare &amp; Choose
            <br />
            <span className="gradient-text">the Best Services</span>
          </h1>

          <p className="mt-6 max-w-lg text-xl leading-relaxed text-muted-foreground">
            Trusted information. Real customer feedback. AI-powered recommendations.
          </p>

          <div className="mt-10 max-w-xl">
            <HeroSearch />
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {FEATURES.map((feature) => (
              <li key={feature.label} className="flex flex-col items-start gap-2.5">
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-xl transition-transform hover:scale-110",
                    feature.tone,
                  )}
                >
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-xs leading-snug font-semibold text-foreground">
                  {feature.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="group">
              <Link href={ROUTES.organizations}>
                Explore Services
                <ArrowRightIcon className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#for-businesses">For Businesses</a>
            </Button>
          </div>

          <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex size-5 items-center justify-center rounded-full bg-success/20 text-success">
              ✓
            </span>
            Free to browse. No account required.
          </p>
        </div>

        {/* Right: professional photo with enhanced frame */}
        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border-2 border-border/60 bg-card shadow-2xl ring-1 ring-black/5">
            <Image
              src="/assets/hero.png"
              alt="Professional Ethiopian woman working on a laptop in a bright modern office."
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className="object-cover object-center"
            />
          </div>
          {/* Decorative glow — teal behind image */}
          <div className="absolute -inset-4 -z-10 bg-gradient-to-br from-accent/20 via-primary/10 to-transparent blur-3xl opacity-60" />
        </div>
      </div>
    </section>
  );
}
