"use client";

import Image from "next/image";
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
  /** Real workplace photo from `public/assets`; live categories will get one as their slices land. */
  image?: { src: string; alt: string };
}

const CATEGORIES: Category[] = [
  {
    title: "Healthcare",
    description: "Hospitals, clinics, and medical services.",
    icon: HeartPulseIcon,
    tone: "bg-primary/10 text-primary ring-1 ring-primary/20",
    image: {
      src: "/assets/health.png",
      alt: "Healthcare professional attending to a patient in a modern clinic.",
    },
  },
  {
    title: "Hotels and Hospitality",
    description: "Hotels, resorts, and accommodation services.",
    icon: HotelIcon,
    tone: "bg-accent/10 text-accent ring-1 ring-accent/20",
    image: {
      src: "/assets/hotel&hospitality.png",
      alt: "Luxury hotel reception and hospitality service area.",
    },
  },
  {
    title: "Restaurants",
    description: "Dining, delivery, and food services.",
    icon: UtensilsIcon,
    tone: "bg-gold/15 text-[#7a5800] ring-1 ring-gold/25",
    image: {
      src: "/assets/restaurant.png",
      alt: "Restaurant setting with professional culinary service.",
    },
  },
  {
    title: "Education",
    description: "Schools, universities, and learning centers.",
    icon: GraduationCapIcon,
    tone: "bg-primary/10 text-primary ring-1 ring-primary/20",
    image: {
      src: "/assets/education.png",
      alt: "Students and educators in a modern learning environment.",
    },
  },
  {
    title: "Software and IT Services",
    description: "Development, tech support, and IT solutions.",
    icon: CpuIcon,
    tone: "bg-accent/10 text-accent ring-1 ring-accent/20",
    industry: "Software",
    image: {
      src: "/assets/tech.png",
      alt: "Software engineer working on technology solutions.",
    },
  },
  {
    title: "Financial Services",
    description: "Banks, insurance, and financial advisory.",
    icon: LandmarkIcon,
    tone: "bg-primary/10 text-primary ring-1 ring-primary/20",
    image: {
      src: "/assets/business_consultant.png",
      alt: "Business consultant presenting financial insights.",
    },
  },
  {
    title: "Home and Professional Services",
    description: "Repairs, cleaning, maintenance, and more.",
    icon: WrenchIcon,
    tone: "bg-gold/15 text-[#7a5800] ring-1 ring-gold/25",
    image: {
      src: "/assets/home&professional_services.png",
      alt: "Professional service provider performing home maintenance and repair work.",
    },
  },
  {
    title: "Other Services",
    description: "Browse all available service categories.",
    icon: LayersIcon,
    tone: "bg-accent/10 text-accent ring-1 ring-accent/20",
  },
];

export function ServiceCategories() {
  const router = useRouter();

  function openCategory(industry: string) {
    useSearchUiStore.getState().setFilters({ industry });
    router.push(ROUTES.search);
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-12 sm:py-14">
      <SectionHeading
        eyebrow="Categories"
        title="Explore Services"
        description="Browse by category and discover trusted providers."
        action={
          <Button asChild variant="outline">
            <Link href={ROUTES.organizations}>
              View All
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((category) => {
          const cardContent = (
            <>
              {category.image ? (
                <div className="relative -mx-5 -mt-5 mb-4">
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={category.image.src}
                      alt={category.image.alt}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"
                  />
                  <span
                    className={cn(
                      "absolute bottom-3 left-3.5 grid size-11 place-items-center rounded-xl shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110",
                      category.tone,
                    )}
                  >
                    <category.icon className="size-5" aria-hidden="true" />
                  </span>
                  {!category.industry && category.title !== "Other Services" && (
                    <Badge
                      variant="muted"
                      className="absolute top-3 right-3 border-white/40 bg-white/90 backdrop-blur-sm shadow-sm"
                    >
                      Coming soon
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span
                    className={cn(
                      "grid size-14 place-items-center rounded-2xl transition-transform group-hover:scale-110",
                      category.tone,
                    )}
                  >
                    <category.icon className="size-7" aria-hidden="true" />
                  </span>
                  {!category.industry && category.title !== "Other Services" && (
                    <Badge variant="muted">Coming soon</Badge>
                  )}
                </div>
              )}
              <h3 className="font-bold text-foreground text-lg">{category.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {category.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {category.industry
                  ? "Explore"
                  : category.title === "Other Services"
                    ? "Browse all"
                    : "Notify me"}
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </>
          );

          const baseClass =
            "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-md transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/8";

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
