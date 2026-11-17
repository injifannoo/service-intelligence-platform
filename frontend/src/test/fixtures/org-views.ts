import { CATEGORIES } from "@/lib/data";
import type { OrgView } from "@/lib/metrics";

const view = (index: number, category: string): OrgView => ({
  id: `org-${index + 1}`,
  slug: `provider-${index + 1}`,
  name: `Provider ${index + 1}`,
  tagline: `${category} specialists in Addis Ababa.`,
  description: `${category} delivery for Ethiopian teams.`,
  category,
  services: [`${category} delivery`, "Discovery workshop"],
  industries: ["Fintech"],
  location: "Bole, Addis Ababa",
  phone: null,
  email: null,
  website: null,
  businessHours: null,
  founded: 2015,
  size: "11-50",
  priceTier: (index % 3) + 1,
  responseHours: 8 + index,
  certifications: ["ISO 27001"],
  status: "verified",
  ownerId: null,
  verified: index % 4 !== 0,
  rating: 4 + (index % 10) / 10,
  reviewCount: 10 + index,
  trustScore: 70 + index,
  sentiment: { positive: 75 + index, neutral: 15, negative: 10 - index },
  strengths: ["Reliable delivery"],
  issues: ["Premium pricing"],
  aiSummary: `${category} provider with consistent delivery.`,
  mainComplaint: "Premium pricing",
  recommendation: "Offer a startup tier.",
  satisfactionTrend: [78, 80, 82, 84],
  logoUrl: null,
});

/** Eight providers, one per canonical category, mirroring the mock catalogue. */
export const ORG_VIEWS: OrgView[] = CATEGORIES.map((category, index) => view(index, category));
