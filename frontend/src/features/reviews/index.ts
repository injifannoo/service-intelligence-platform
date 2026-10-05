/**
 * Public API surface for the reviews slice.
 *
 * Features are consumed exclusively through this barrel
 * (docs/07_Project_Structure.md:219).
 */
export { ReviewForm } from "./components/review-form";
export { ReviewList } from "./components/review-list";
export { RATING_SCALE, RatingInput, StarRating } from "./components/star-rating";

export { reviewsApi } from "./api/get-reviews";
export {
  reviewKeys,
  useCreateReview,
  useOrganizationReviews,
  useReportReview,
} from "./api/use-reviews";

export type {
  OrganizationReview,
  REVIEW_REPORT_REASONS,
  Review,
  ReviewInput,
  ReviewReportReason,
} from "./types";
