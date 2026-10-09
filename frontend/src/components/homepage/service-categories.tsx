"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CpuIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  HotelIcon,
  LandmarkIcon,
  LayersIcon,
  UtensilsIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/site-config";
import { useSearchUiStore } from "@/features/search";
import { cn } from "@/lib/utils";

interface Category {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  /**
   * Only set when the category maps to a live industry slice. Categories with
   * no backing data render as "Coming soon" rather than linking to an empty
   * result page.
   */
  industry?: string;
}

const CATEGORIES: Category[] = [
  {
    title: "Healthcare",
    description: "Hospitals, clinics, and medical services.",
    icon: HeartPulseIcon,
    tone: "bg-[#EEF7FF] text-[#0866F5]",
  },
  {
    title: "Hotels and Hospitality",
    description: "Hotels, resorts, and accommodation services.",
    icon: HotelIcon,
    tone: "bg-[#E6FBF8] text-[#14B8A6]",
  },
  {
    title: "Restaurants",
    description: "Dining, delivery, and food services.",
    icon: UtensilsIcon,
    tone: "bg-[#FFF4E5] text-[#F59E0B]",
  },
  {
    title: "Education",
    description: "Schools, universities, and learning centers.",
    icon: GraduationCapIcon,
    tone: "bg-[#EEF7FF] text-[#0866F5]",
  },
  {
    title: "Software and IT Services",
    description: "Development, tech support, and IT solutions.",
    icon: CpuIcon,
    tone: "bg-[#F3EDFF] text-[#8B5CF6]",
    industry: "Software",
  },
  {
    title: "Financial Services",
    description: "Banks, insurance, and financial advisory services.",
    icon: LandmarkIcon,
    tone: "bg-[#EEF7FF] text-[#0866F5]",
  },
  {
    title: "Home and Professional Services",
    description: "Repairs, cleaning, maintenance, and more.",
    icon: WrenchIcon,
    tone: "bg-[#FFF4E5] text-[#F59E0B]",
  },
  {
    title: "Other Services",
    description: "Various services for your convenience.",
    icon: LayersIcon,
    tone: "bg-[#EEF7FF] text-[#0866F5]",
  },
];

export function ServiceCategories() {
  const router = useRouter();

  function openCategory(industry: string) {
    useSearchUiStore.getState().setFilters({ industry });
    router.push(ROUTES.search);
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-16 sm:py-20">
      <SectionHeading
        eyebrow="Browse"
        title="Explore Service Categories"
        description="Find the right service for your needs. Browse by category and discover trusted providers near you."
        action={
          <Button asChild variant="outline">
            <Link href={ROUTES.organizations}>
              View All Categories
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((category) => {
          const cardContent = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "grid size-12 place-items-center rounded-2xl",
                    category.tone,
                  )}
                >
                  <category.icon className="size-6" aria-hidden="true" />
                </span>
                {!category.industry && category.title !== "Other Services" && (
                  <Badge variant="muted">Coming soon</Badge>
                )}
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{category.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {category.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                {category.industry
                  ? "Explore"
                  : category.title === "Other Services"
                    ? "Browse all"
                    : "Notify me"}
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </>
          );

          const baseClass =
            "group flex flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-xs transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md";

          if (category.industry) {
            return (
              <button
                key={category.title}
                type="button"
                onClick={() => openCategory(category.industry as string)}
                className={cn(baseClass, "cursor-pointer")}
              >
                {cardContent}
              </button>
            );
          }

          if (category.title === "Other Services") {
            return (
              <Link key={category.title} href={ROUTES.organizations} className={baseClass}>
                {cardContent}
              </Link>
            );
          }

          return (
            <div key={category.title} className={cn(baseClass, "opacity-90")}>
              {cardContent}
            </div>
          );
        })}
      </div>
    </section>
  );
}
