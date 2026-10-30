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
      <div className="mx-auto w-full max-w-7xl px-6 py-14 sm:py-16">
        <SectionHeading
          align="center"
          eyebrow="Why Choose Us"
          title="Make Confident Decisions"
          description="Reliable information and transparent comparisons for better service choices."
        />

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="group relative rounded-3xl border border-border bg-card p-6 text-center shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent shadow-sm ring-1 ring-accent/25 transition-transform group-hover:scale-110">
                <benefit.icon className="size-7" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{benefit.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {benefit.body}
              </p>
              {/* Subtle teal top-edge glow on hover */}
              <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-accent/8 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
