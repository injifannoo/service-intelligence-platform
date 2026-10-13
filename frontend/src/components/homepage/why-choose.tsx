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
 * Trust section.
 *
 * Rendered as platform benefits rather than testimonials because no verified,
 * attributable customer quotes exist. Inventing either would be a claim the
 * product cannot support.
 */
export function WhyChoose() {
  return (
    <section id="about" className="scroll-mt-20 border-y border-border bg-[#F5FAFF]">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 sm:py-20">
        <SectionHeading
          align="center"
          eyebrow="Trust"
          title="Why Choose ASIP?"
          description="Built to help you make confident service decisions with information you can rely on."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-2xl border border-border bg-[#EEF7FF] p-6 text-center"
            >
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-card text-primary shadow-xs">
                <benefit.icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {benefit.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
