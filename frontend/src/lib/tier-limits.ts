import type { OrganizationSubscription, SubscriptionTier } from "@/types/platform-contracts";

export const TIER_QUOTAS: Record<SubscriptionTier, Omit<OrganizationSubscription, "status" | "currentPeriodEnd">> = {
  FREE: {
    tier: "FREE",
    maxGalleryPhotos: 3,
    canExportAnalytics: false,
    hasAiAdvisor: false,
    hasPublicApiAccess: false,
  },
  BASIC: {
    tier: "BASIC",
    maxGalleryPhotos: 6,
    canExportAnalytics: true,
    hasAiAdvisor: false,
    hasPublicApiAccess: false,
  },
  PRO: {
    tier: "PRO",
    maxGalleryPhotos: 12,
    canExportAnalytics: true,
    hasAiAdvisor: true,
    hasPublicApiAccess: false,
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    maxGalleryPhotos: 24,
    canExportAnalytics: true,
    hasAiAdvisor: true,
    hasPublicApiAccess: true,
  },
};

export function resolveOrganizationSubscription(
  tier?: string | null,
  status: OrganizationSubscription["status"] = "ACTIVE",
  currentPeriodEnd: string | null = null,
): OrganizationSubscription {
  const normalized = (tier?.toUpperCase() as SubscriptionTier) || "FREE";
  const quota = TIER_QUOTAS[normalized] ?? TIER_QUOTAS.FREE;
  return {
    ...quota,
    status,
    currentPeriodEnd,
  };
}