/**
 * Review DTOs.
 *
 * `OrganizationReview` carries the organization name the backend decorates onto
 * org-scoped review rows; `REVIEW_REPORT_REASONS` is the moderation vocabulary
 * (docs/05_API_Design.md:436-441 documents the endpoint but no reason list, so
 * this is a frontend-side assumption — see src/types/index.ts).
 */
export type {
  OrganizationReview,
  REVIEW_REPORT_REASONS,
  Review,
  ReviewInput,
  ReviewReportReason,
} from "@/types";
