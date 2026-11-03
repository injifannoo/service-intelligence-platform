/**
 * Blueprint §5 — User Personas & Permissions
 *
 * Implements permissions and feature gating for:
 * 1. 4 Customer Tiers: Guest, Customer, Verified Customer, Premium Customer
 * 2. 3 Org Tiers: Registered, Verified, Premium
 * 3. 3 Admin Tiers: Moderator, Admin, Super Admin
 */

import type {
  AdminTier,
  CustomerTier,
  Organization,
  OrganizationTier,
  User,
} from "@/types";

/* -------------------------------------------------------------------------- */
/* Customer Personas & Permissions (Blueprint §5)                              */
/* -------------------------------------------------------------------------- */

export interface CustomerPermissions {
  canBrowse: boolean;
  canSearch: boolean;
  canViewProfile: boolean;
  canWriteReview: boolean;
  canVerifyReview: boolean;
  canDetailedCriteria: boolean;
  canAIReviewSummary: boolean;
  canAIAdvancedInsights: boolean;
  canCompare: boolean;
  maxComparisonCount: number;
  canExportComparison: boolean;
  canReportReview: boolean;
  badgeLabel: string;
  badgeVariant: "outline" | "secondary" | "success" | "accent";
  description: string;
}

export function getCustomerTier(user: User | null | undefined): CustomerTier {
  if (!user) return "GUEST";
  if (user.customer_tier) return user.customer_tier;
  return "CUSTOMER";
}

export function getCustomerPermissions(tier: CustomerTier): CustomerPermissions {
  switch (tier) {
    case "GUEST":
      return {
        canBrowse: true,
        canSearch: true,
        canViewProfile: true,
        canWriteReview: false,
        canVerifyReview: false,
        canDetailedCriteria: false,
        canAIReviewSummary: false,
        canAIAdvancedInsights: false,
        canCompare: false,
        maxComparisonCount: 0,
        canExportComparison: false,
        canReportReview: false,
        badgeLabel: "Guest",
        badgeVariant: "outline",
        description: "Public directory explorer with read-only visibility.",
      };
    case "CUSTOMER":
      return {
        canBrowse: true,
        canSearch: true,
        canViewProfile: true,
        canWriteReview: true,
        canVerifyReview: false,
        canDetailedCriteria: false,
        canAIReviewSummary: true,
        canAIAdvancedInsights: false,
        canCompare: true,
        maxComparisonCount: 2,
        canExportComparison: false,
        canReportReview: true,
        badgeLabel: "Customer",
        badgeVariant: "secondary",
        description: "Registered account. Write reviews and basic 2-provider comparisons.",
      };
    case "VERIFIED_CUSTOMER":
      return {
        canBrowse: true,
        canSearch: true,
        canViewProfile: true,
        canWriteReview: true,
        canVerifyReview: true,
        canDetailedCriteria: true,
        canAIReviewSummary: true,
        canAIAdvancedInsights: false,
        canCompare: true,
        maxComparisonCount: 4,
        canExportComparison: false,
        canReportReview: true,
        badgeLabel: "Verified Customer",
        badgeVariant: "success",
        description: "Identity-verified customer. Verified reviews, 5-dimension ratings, 4-provider comparisons.",
      };
    case "PREMIUM_CUSTOMER":
      return {
        canBrowse: true,
        canSearch: true,
        canViewProfile: true,
        canWriteReview: true,
        canVerifyReview: true,
        canDetailedCriteria: true,
        canAIReviewSummary: true,
        canAIAdvancedInsights: true,
        canCompare: true,
        maxComparisonCount: 10,
        canExportComparison: true,
        canReportReview: true,
        badgeLabel: "Premium Customer",
        badgeVariant: "accent",
        description: "Paid tier. Unlimited comparison, AI synthesis, export reports, and priority reviews.",
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Organization Personas & Dashboard Features (Blueprint §5)                   */
/* -------------------------------------------------------------------------- */

export interface OrgDashboardPermissions {
  canViewBasicStats: boolean;
  canManageServices: boolean;
  canViewSentiment: boolean;
  canViewRatingTrends: boolean;
  canViewCompetitorRank: boolean;
  canExportDashboard: boolean;
  canAccessAiInsights: boolean;
  tierLabel: string;
  tierVariant: "outline" | "success" | "accent";
  description: string;
}

export function getOrgTier(organization: Organization | null | undefined): OrganizationTier {
  if (!organization) return "REGISTERED";
  if (organization.tier) return organization.tier;
  if (organization.verification_status === "VERIFIED") return "VERIFIED";
  return "REGISTERED";
}

export function getOrgDashboardPermissions(tier: OrganizationTier): OrgDashboardPermissions {
  switch (tier) {
    case "REGISTERED":
      return {
        canViewBasicStats: true,
        canManageServices: true,
        canViewSentiment: false,
        canViewRatingTrends: false,
        canViewCompetitorRank: false,
        canExportDashboard: false,
        canAccessAiInsights: false,
        tierLabel: "Registered Org",
        tierVariant: "outline",
        description: "Standard registered profile with service catalog and profile views count.",
      };
    case "VERIFIED":
      return {
        canViewBasicStats: true,
        canManageServices: true,
        canViewSentiment: true,
        canViewRatingTrends: true,
        canViewCompetitorRank: false,
        canExportDashboard: false,
        canAccessAiInsights: false,
        tierLabel: "Verified Org",
        tierVariant: "success",
        description: "Document-verified provider. Unlocks customer sentiment polarity and monthly rating trends.",
      };
    case "PREMIUM":
      return {
        canViewBasicStats: true,
        canManageServices: true,
        canViewSentiment: true,
        canViewRatingTrends: true,
        canViewCompetitorRank: true,
        canExportDashboard: true,
        canAccessAiInsights: true,
        tierLabel: "Premium Org",
        tierVariant: "accent",
        description: "Full analytics suite. Unlocks industry competitor ranking, AI review insights, and CSV/PDF export.",
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Admin Personas & Visible Actions (Blueprint §5)                             */
/* -------------------------------------------------------------------------- */

export interface AdminActionPermissions {
  canAccessAdmin: boolean;
  canViewDashboard: boolean;
  canViewOrganizations: boolean;
  canModerateReviews: boolean;
  canViewVerificationQueue: boolean;
  canApproveVerification: boolean;
  canViewAuditLogs: boolean;
  canManageUsers: boolean;
  canManageHomepage: boolean;
  tierLabel: string;
  tierVariant: "outline" | "secondary" | "accent";
  description: string;
}

export function getAdminTier(user: User | null | undefined): AdminTier | null {
  if (!user) return null;
  if (user.role === "MODERATOR") return "MODERATOR";
  if (user.role === "ADMIN") return "ADMIN";
  if (user.role === "SUPER_ADMIN") return "SUPER_ADMIN";
  return null;
}

export function getAdminActions(tier: AdminTier | null): AdminActionPermissions {
  if (!tier) {
    return {
      canAccessAdmin: false,
      canViewDashboard: false,
      canViewOrganizations: false,
      canModerateReviews: false,
      canViewVerificationQueue: false,
      canApproveVerification: false,
      canViewAuditLogs: false,
      canManageUsers: false,
      canManageHomepage: false,
      tierLabel: "None",
      tierVariant: "outline",
      description: "No admin privileges.",
    };
  }

  switch (tier) {
    case "MODERATOR":
      return {
        canAccessAdmin: true,
        canViewDashboard: true,
        canViewOrganizations: true,
        canModerateReviews: true,
        canViewVerificationQueue: false,
        canApproveVerification: false,
        canViewAuditLogs: false,
        canManageUsers: false,
        canManageHomepage: false,
        tierLabel: "Moderator",
        tierVariant: "outline",
        description: "Content moderation queue: review complaints, dismiss reports, and remove abusive content.",
      };
    case "ADMIN":
      return {
        canAccessAdmin: true,
        canViewDashboard: true,
        canViewOrganizations: true,
        canModerateReviews: true,
        canViewVerificationQueue: true,
        canApproveVerification: true,
        canViewAuditLogs: true,
        canManageUsers: false,
        canManageHomepage: false,
        tierLabel: "Admin",
        tierVariant: "secondary",
        description: "Platform operations: verify business documentation, manage audit logs, and moderate content.",
      };
    case "SUPER_ADMIN":
      return {
        canAccessAdmin: true,
        canViewDashboard: true,
        canViewOrganizations: true,
        canModerateReviews: true,
        canViewVerificationQueue: true,
        canApproveVerification: true,
        canViewAuditLogs: true,
        canManageUsers: true,
        canManageHomepage: true,
        tierLabel: "Super Admin",
        tierVariant: "accent",
        description: "Full platform governance: provision admin roles, configure homepage sections, and access all tooling.",
      };
  }
}
