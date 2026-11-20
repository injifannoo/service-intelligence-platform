import type { Metadata } from "next";
import { ORGS } from "@/lib/data";
import { toView } from "@/lib/api";

export function buildOrganizationMetadata(slug: string): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (ORGS as any[]).find((o) => o.slug === slug || o.id === slug);

  if (!raw) {
    return {
      title: "Provider Not Found | ASIP Ethiopia",
      description: "Explore verified software, IT, and digital service providers in Addis Ababa, Ethiopia.",
    };
  }

  const org = toView(raw);
  const title = `${org.name} — Verified ${org.category} in ${org.location} | ASIP`;
  const description =
    org.tagline ||
    org.description?.slice(0, 155) ||
    `Read verified reviews, ratings (${org.rating.toFixed(1)}/5), and service offerings for ${org.name} in Ethiopia.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/organizations/${org.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/organizations/${org.slug}`,
      siteName: "ASIP — AI Service Intelligence Platform",
      type: "website",
    },
  };
}

export function buildOrganizationJsonLd(slug: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (ORGS as any[]).find((o) => o.slug === slug || o.id === slug);
  if (!raw) return null;

  const org = toView(raw);
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: org.name,
    description: org.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: org.location || "Addis Ababa",
      addressCountry: "ET",
    },
    ...(org.website ? { url: org.website } : {}),
    ...(org.phone ? { telephone: org.phone } : {}),
    ...(org.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: org.rating.toFixed(1),
            reviewCount: org.reviewCount,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };
}