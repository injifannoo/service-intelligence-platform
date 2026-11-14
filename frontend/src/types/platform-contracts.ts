/** Subscription tiers mapped to Chapa billing plans in Django */
export type SubscriptionTier = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";

export interface OrganizationSubscription {
  tier: SubscriptionTier;
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIALING";
  currentPeriodEnd: string | null;
  maxGalleryPhotos: number;
  canExportAnalytics: boolean;
  hasAiAdvisor: boolean;
  hasPublicApiAccess: boolean;
}

/** Deep identity verification provenance for reviewers & organizations */
export type VerificationTier = "UNVERIFIED" | "PHONE_VERIFIED" | "FAYDA_VERIFIED" | "VERIFIED_BUYER";

export interface TrustVerificationBadge {
  tier: VerificationTier;
  isPhoneVerified: boolean;
  isFaydaVerified: boolean;
  hasProofOfPurchase: boolean;
  verifiedAt?: string | null;
}

/** Hybrid pgvector + full-text semantic search payload */
export interface SemanticSearchRequest {
  query: string;
  category?: string;
  location?: string;
  verifiedOnly?: boolean;
  limit?: number;
}

export interface SemanticSearchMatch {
  orgId: string;
  slug: string;
  semanticScore: number; // 0.0 to 1.0 cosine similarity from pgvector
  keywordScore: number;
  combinedRank: number;
  matchedConcepts: string[];
}

/** AI Business Advisor monthly briefing payload (FastAPI -> Django -> Dashboard) */
export interface MonthlyAdvisorBriefing {
  orgId: string;
  monthLabel: string; // e.g., "2026-11"
  executiveSummary: string;
  topStrengths: string[];
  recurringFrictionPoints: string[];
  recommendedActions: {
    priority: "HIGH" | "MEDIUM" | "LOW";
    action: string;
    expectedImpact: string;
  }[];
  generatedAt: string;
}