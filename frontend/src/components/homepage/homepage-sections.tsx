"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { HOMEPAGE_SECTIONS } from "@/types";
import type { HomepageSettings, HomepageSectionKey } from "@/types";

import { FeaturedProviders } from "./featured-providers";
import { FinalCta } from "./final-cta";
import { ForBusinesses } from "./for-businesses";
import { HeroSection } from "./hero-section";
import { HowItWorks } from "./how-it-works";
import { MetricsStrip } from "./metrics-strip";
import { ServiceCategories } from "./service-categories";
import { WhyChoose } from "./why-choose";

const fallback: Record<HomepageSectionKey, boolean> = Object.fromEntries(
  HOMEPAGE_SECTIONS.map((key) => [key, true]),
) as Record<HomepageSectionKey, boolean>;

/**
 * Renders the homepage sections, honouring which ones `superadmin@asip.dev`
 * has switched on in `/admin/homepage`.
 *
 * The fallback shows every section, so the statically prerendered HTML contains
 * the full homepage until the settings arrive, then switches to the configured
 * set. Disabled sections unmount rather than being hidden, so a section that is
 * turned back on returns exactly as it was built.
 */
export function HomepageSections() {
  const { data } = useQuery({
    queryKey: ["settings", "homepage"],
    queryFn: () => apiClient.get<HomepageSettings>("/settings/homepage/"),
    staleTime: 60 * 1000,
  });

  const sections: Record<HomepageSectionKey, boolean> = data?.sections ?? fallback;

  return (
    <>
      {sections.hero && <HeroSection />}
      {sections.howItWorks && <HowItWorks />}
      {sections.metrics && <MetricsStrip />}
      {sections.categories && <ServiceCategories />}
      {sections.featuredProviders && <FeaturedProviders />}
      {sections.forBusinesses && <ForBusinesses />}
      {sections.whyChoose && <WhyChoose />}
      {sections.finalCta && <FinalCta />}
    </>
  );
}