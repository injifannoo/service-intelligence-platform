/**
 * Public API surface for the organizations slice.
 *
 * Per docs/07_Project_Structure.md:219, features are consumed exclusively
 * through this barrel. Deep imports into `features/organizations/*` from
 * outside the slice are an architectural violation.
 */
export {
  OrganizationCard,
  OrganizationCardSkeleton,
} from "./components/organization-card";
export { OrganizationDetail } from "./components/organization-detail";
export { OrganizationForm } from "./components/organization-form";
export { OrganizationList } from "./components/organization-list";
export { OrganizationDashboardPanel } from "./components/organization-dashboard";
export { DashboardExportButton } from "./components/dashboard-export";
export { OrganizationAnalytics } from "./components/organization-analytics";
export { ReviewSummaryCard } from "./components/review-summary-card";

export { organizationsApi } from "./api/get-organizations";
export { useOrganizationDashboard } from "./api/use-dashboard";
export {
  organizationKeys,
  useAiReviewSummaryTask,
  useCreateOrganization,
  useOrganization,
  useOrganizations,
  useRequestAiReviewSummary,
  useUpdateOrganization,
} from "./api/use-organization";

export { useOrganizationUiStore } from "./store/organization-store";

export {
  VERIFICATION_BADGE_VARIANT,
  VERIFICATION_LABELS,
} from "./types";
export type {
  Organization,
  OrganizationFilters,
  OrganizationInput,
  Service,
  VerificationStatus,
} from "./types";
