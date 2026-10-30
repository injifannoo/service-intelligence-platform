import { ScaleIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";

import { SectionHeading } from "@/components/shared/section-heading";

const BENEFITS = [
  {
    icon: ShieldCheckIcon,
    title: "Trusted Information",
    body: "Make decisions with reliable, transparent information.",
  },
  {
    icon: ScaleIcon,
    title: "Transparent Comparisons",
    body: "Compare services using relevant information and customer feedback.",
  },
  {
    icon: SparklesIcon,
    title: "Better Experiences",
    body: "Choose services that better match your needs.",
  },
] as const;

/**
 * Trust section with refined benefit cards.
 *
 * Platform benefits showcased in elegant cards with modern styling and
 * sophisticated color palette.
 */
export function WhyChoose() {
  return (
    <section id="about" className="scroll-mt-20 border-y border-border bg-secondary">
      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-12">
        <SectionHeading
          align="center"
          eyebrow="Why Choose Us"
          title="Make Confident Decisions"
          description="Reliable information and transparent comparisons for better service choices."
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="group relative rounded-xl border border-border bg-card p-5 shadow-sm transition-colors duration-200 hover:border-accent/40"
            >
              <div className="mb-3 grid size-10 place-items-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20 transition-transform group-hover:scale-105">
                <benefit.icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{benefit.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {benefit.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
