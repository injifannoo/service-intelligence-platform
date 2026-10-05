/**
 * Cross-domain platform types.
 *
 * Derived from:
 *   - docs/04_Database_Design.md (entities, fields, enums, relationships)
 *   - docs/05_API_Design.md     (endpoints, envelopes, request/response payloads)
 *
 * ---------------------------------------------------------------------------
 * RESOLVED CONTRADICTIONS
 * ---------------------------------------------------------------------------
 * The specs disagree in places. Each resolution is recorded here so the choice
 * is auditable rather than incidental.
 *
 * 1. PRIMARY KEYS ARE UUIDs, NOT INTEGERS.
 *    docs/04 marks every entity `id UUID` (04:242-511) and docs/06:512-527
 *    mandates UUIDs for public-facing entities. But docs/05 shows integers in
 *    example payloads: `"organization_id": 1` (05:418) and
 *    `"organizations": [1, 2, 3]` (05:509). The schema and the coding standard
 *    win; those examples are illustrative. Every ID below is a `UUID` string.
 *
 * 2. ROLE VALUES ARE `SCREAMING_SNAKE_CASE` ON THE WIRE.
 *    docs/04:260-270 fixes the database enum to `Customer`,
 *    `Organization Owner`, `Admin`, `Super Admin`. Those are display labels and
 *    are unsuitable as API values (spaces, mixed case, no stable key). The API
 *    uses SCREAMING_SNAKE_CASE; `USER_ROLE_LABELS` maps back for display. The
 *    backend must persist the docs' values and translate at the API boundary.
 *
 * 3. `verification_status` VALUES ARE AN ASSUMPTION.
 *    docs/04:291 declares an Enum but never enumerates it, and docs/04:392
 *    duplicates the state on `Verification.status` with no rule for which the
 *    API returns. `VERIFICATION_STATUSES` is assumed; confirm with the backend.
 *
 * 4. `Review.rating` RANGE IS AN ASSUMPTION OF 1-5.
 *    docs/04:350 types it Integer and never states the scale. docs/04:365-375
 *    lists a separate multi-dimension `Rating` vocabulary (Quality, Price,
 *    Customer Service, Speed, Overall Experience) that contradicts a single
 *    integer, and defines no columns at all. Treated as 1-5 stars here; the
 *    multi-dimension model is not implemented.
 *
 * 5. ORGANIZATION OWNERSHIP IS NOT IN THE SCHEMA — SEE `UserProfile`.
 *    The role `Organization Owner` exists (04:266) and every analytics, AI, and
 *    subscription row is organization-scoped (04:474, 04:486, 04:434), but
 *    `Organization` has no `owner_id` or `user_id` (04:274-292). Nothing in the
 *    schema can answer "which organization does this user manage?", which the
 *    organization workspace requires. `UserProfile.organization_id` is an
 *    additive extension pending a backend decision. ESCALATED.
 *
 * 6. AGGREGATE RATINGS MUST COME FROM THE API.
 *    No `average_rating`, `rating_count`, or `review_count` column exists on
 *    `Organization` or `Service` (docs/04), yet docs/05:310 filters on `rating`
 *    and 05:326-332 returns `"rating": 4.5`. The backend must compute these; the
 *    frontend never derives them from the reviews it happens to have loaded.
 *
 * 7. NO TIMESTAMPS BEYOND `created_at`.
 *    docs/04 defines no `updated_at` on any table, so no `updated_at` appears
 *    below and no optimistic-update or incremental-sync affordance is assumed.
 *
 * 8. NO CURRENCY ON `Service.price`.
 *    docs/04:332 types `price` as Decimal with no currency column, and docs/04
 *    has no payments or transactions table. Price renders as a bare number; do
 *    not hardcode a currency symbol.
 *
 * 9. NOT IN THE SCHEMA, SO NOT TYPED HERE.
 *    `Bookmarks`, `Notifications`, `Category` and `Transactions` are referenced
 *    narratively (docs/02:123, docs/04:130, docs/03:252) but have no table, no
 *    fields, and no API. No types are invented for them.
 */

export type UUID = string;

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

/** Role enum, docs/04_Database_Design.md:260-270 (see contradiction 2). */
export const USER_ROLES = [
  "CUSTOMER",
  "ORGANIZATION_OWNER",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Display labels, keyed by API value. Source: docs/04:260-270. */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  ORGANIZATION_OWNER: "Organization Owner",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

/**
 * Verification enum. Values are ASSUMED; docs/04:291 never enumerates them.
 * See contradiction 3.
 */
export const VERIFICATION_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  PENDING: "Pending review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

/** The only other enum in the docs is `User.role`; everything else is a boolean. */
export const AUDIENCE_ROLES = ["ALL", "CUSTOMER", "ORGANIZATION_OWNER", "ADMIN"] as const;
export type AudienceRole = (typeof AUDIENCE_ROLES)[number];

/* -------------------------------------------------------------------------- */
/* Envelope (docs/05_API_Design.md:198-235)                                    */
/* -------------------------------------------------------------------------- */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface Pagination {
  count: number;
  next: string | null;
  previous: string | null;
  page_size: number;
}

export interface PaginatedData<T> {
  success: true;
  data: T[];
  pagination: Pagination;
}

/* -------------------------------------------------------------------------- */
/* User (docs/04_Database_Design.md:242-270)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Mirrors the `users` table. `password_hash` (04:255) is intentionally absent —
 * it must never be serialised or rendered. The docs specify no field-level
 * exclusion policy, so this is a frontend-side guard only.
 */
export interface User {
  id: UUID;
  name: string;
  email: string;
  role: UserRole;
  status: boolean;
  created_at: string;
}

/**
 * Response of `GET /api/v1/users/profile/` (docs/05:252-258).
 *
 * `organization_id` is an ADDITIVE EXTENSION, not a `users` column. See
 * contradiction 5 — this is the field the organization workspace needs and the
 * schema does not provide.
 */
export interface UserProfile extends User {
  organization_id: UUID | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

/** Request of `PUT /api/v1/users/profile/` (docs/05:262-268). */
export interface UserProfileInput {
  name: string;
  email: string;
}

/* -------------------------------------------------------------------------- */
/* Industry (docs/04_Database_Design.md:296-314)                              */
/* -------------------------------------------------------------------------- */

/**
 * The docs give Industry no field table — only the ERD field list (04:188-192)
 * and example values (04:304-314) that are explicitly labelled "examples", not
 * a closed enum. There is no slug/code column, so the UUID is the only stable
 * key and any display name comes from the backend.
 */
export interface Industry {
  id: UUID;
  name: string;
  description: string | null;
}

/* -------------------------------------------------------------------------- */
/* Organization (docs/04_Database_Design.md:274-292)                           */
/* -------------------------------------------------------------------------- */

export interface Organization {
  id: UUID;
  name: string;
  description: string | null;
  industry_id: UUID | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  verification_status: VerificationStatus;
  /**
   * Backend-computed aggregate. Not a column in docs/04 — see contradiction 6.
   * Always `null` when the organisation has no reviews.
   */
  rating: number | null;
  created_at: string;
}

/**
 * Response of `GET /api/v1/organizations/{id}/` (docs/05:324-332), which nests
 * the service catalogue alongside the organisation.
 */
export interface OrganizationDetail extends Organization {
  services: Service[];
  industry?: Industry | null;
  review_count?: number;
}

/** Request of `POST /api/v1/organizations/` (docs/05:282-290). */
export interface OrganizationInput {
  name: string;
  industry: string;
  description?: string;
  location?: string;
  phone?: string;
  website?: string;
}

/** List filters, docs/05_API_Design.md:302-312. */
export interface OrganizationFilters {
  industry?: string;
  location?: string;
  rating?: number;
  price?: number;
  page?: number;
  page_size?: number;
  search?: string;
}

/* -------------------------------------------------------------------------- */
/* Service (docs/04_Database_Design.md:318-333)                                */
/* -------------------------------------------------------------------------- */

export interface Service {
  id: UUID;
  organization_id: UUID;
  name: string;
  description: string | null;
  /** Bare number; docs/04 defines no currency. See contradiction 8. */
  price: number | null;
  status: boolean;
}

/** Request of `POST /api/v1/services/` (docs/05:369-381). */
export interface ServiceInput {
  name: string;
  description?: string;
  price?: number;
  organization_id?: UUID;
}

/* -------------------------------------------------------------------------- */
/* Review (docs/04_Database_Design.md:337-353)                                 */
/* -------------------------------------------------------------------------- */

export interface Review {
  id: UUID;
  user_id: UUID;
  organization_id: UUID;
  /** 1-5, assumed. See contradiction 4. */
  rating: number;
  comment: string | null;
  /** Meaning is undefined in docs/04:352. */
  verified: boolean;
  created_at: string;
  /** Convenience field for rendering; not a `reviews` column. */
  author_name?: string;
}

/** Request of `POST /api/v1/reviews/` (docs/05:409-421). */
export interface ReviewInput {
  organization_id: UUID;
  rating: number;
  comment?: string;
}

/** One row of `GET /api/v1/organizations/{id}/reviews/` (docs/05:426-432). */
export interface OrganizationReview extends Review {
  organization_name?: string;
}

export const REVIEW_REPORT_REASONS = [
  "SPAM",
  "OFFENSIVE",
  "IRRELEVANT",
  "FAKE",
  "OTHER",
] as const;

export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number];

/* -------------------------------------------------------------------------- */
/* Verification (docs/04_Database_Design.md:379-393)                           */
/* -------------------------------------------------------------------------- */

/**
 * docs/04:391 types `document` as a File with no URL or path column, and
 * docs/05:348-356 sends `document_url` as a remote URL. The two do not agree on
 * how a document is referenced. `document_url` is modelled as a string because
 * that is the only concrete shape the API spec gives.
 */
export interface VerificationClaim {
  id: UUID;
  organization_id: UUID;
  document_type: string;
  document_url: string;
  status: VerificationStatus;
  verified_at: string | null;
  organization_name?: string;
  created_at: string;
}

export const VERIFICATION_DOCUMENT_TYPES = [
  "BUSINESS_LICENSE",
  "TAX_CERTIFICATE",
  "TRADE_REGISTRATION",
  "OTHER",
] as const;

export type VerificationDocumentType = (typeof VERIFICATION_DOCUMENT_TYPES)[number];

/** Request of `POST /api/v1/organizations/{id}/verify/` (docs/05:348-356). */
export interface VerificationClaimInput {
  document_type: VerificationDocumentType | string;
  document_url: string;
}

/* -------------------------------------------------------------------------- */
/* Audit log (docs/04_Database_Design.md:626-628)                              */
/* -------------------------------------------------------------------------- */

/**
 * docs/04:628 declares no primary key for `audit_logs` and calls its timestamp
 * `timestamp` while every other table uses `created_at`. Both are followed as
 * written, and `id` is typed as optional because the docs do not guarantee one.
 */
export interface AuditLog {
  id?: UUID;
  user_id: UUID;
  action: string;
  resource_id: string;
  timestamp: string;
  user_name?: string;
}

/* -------------------------------------------------------------------------- */
/* Comparison (docs/04_Database_Design.md:415-428)                             */
/* -------------------------------------------------------------------------- */

export interface Comparison {
  id: UUID;
  user_id: UUID;
  /** docs/04:427 stores this as an untyped JSON array; the shape is undocumented. */
  organizations: unknown;
  created_at: string;
}

/** Request of `POST /api/v1/comparison/` (docs/05:502-510). */
export interface ComparisonRequest {
  organizations: UUID[];
  criteria: string[];
}

/**
 * Response of `POST /api/v1/comparison/` (docs/05:514-519), which returns a
 * single `comparison` key. The inner row shape is not specified by any doc.
 */
export interface ComparisonResult {
  /**
   * Each row is an organization plus its service catalogue, which is what a
   * comparison matrix needs. ASSUMPTION: the inner row shape is unspecified by
   * every document, so `OrganizationDetail` is reused here.
   */
  organizations: OrganizationDetail[];
  criteria: string[];
}

/* -------------------------------------------------------------------------- */
/* Search (docs/05_API_Design.md:446-491)                                      */
/* -------------------------------------------------------------------------- */

/** Response of `GET /api/v1/search/?query=...` (docs/05:448-459). */
export interface SearchResults {
  organizations: Organization[];
  pagination: Pagination | null;
}

/** One entry of `POST /api/v1/search/ai/` (docs/05:480-491). */
export interface SemanticSearchHit {
  name: string;
  reason: string;
  id?: UUID;
}

/* -------------------------------------------------------------------------- */
/* AI (docs/05_API_Design.md:524-586, docs/10_AI_Roadmap.md:199-207)          */
/* -------------------------------------------------------------------------- */

/**
 * Status enum is INCONSISTENT ACROSS DOCS and merged here defensively:
 *   - docs/05:537 returns "PROCESSING" on the 202
 *   - docs/12:206 documents the lifecycle as PENDING -> SUCCESS
 *   - docs/10 specifies no enum at all
 * A client must not assume PROCESSING is the initial value, or that a
 * non-terminal task is PROCESSING rather than PENDING.
 */
export const AI_TASK_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SUCCESS",
  "FAILURE",
] as const;

export type AiTaskStatus = (typeof AI_TASK_STATUSES)[number];

/** Response of `POST /api/v1/organizations/{id}/ai/review-summary/` (docs/05:532-540). */
export interface AiTaskAccepted {
  task_id: UUID;
  status: AiTaskStatus;
}

/** Response of `GET /api/v1/ai/tasks/{task_id}/` (docs/10:206). */
export interface AiTaskResult<T = unknown> {
  task_id: UUID;
  status: AiTaskStatus;
  result: T | null;
}

/**
 * `ai_insight` payload (docs/04:504-511). docs/03:516 literally writes
 * "Weakness" (singular) in its Strengths/Weakness list; the plural form is
 * used here as the likely intent. Confirm the exact key with the backend.
 */
export interface ReviewSummary {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  sentiment_score?: number;
}

/**
 * Response of `POST /api/v1/ai/sentiment/` (docs/05:552-558). Two-way
 * percentage split with no `neutral` key, which contradicts the three-way
 * Positive/Negative/Neutral model in docs/10:173-195.
 */
export interface SentimentScore {
  positive: number;
  negative: number;
}

/* -------------------------------------------------------------------------- */
/* Analytics (docs/05_API_Design.md:591-613)                                    */
/* -------------------------------------------------------------------------- */

/**
 * Response of `GET /api/v1/organizations/{id}/analytics/dashboard/`.
 *
 * docs/04:476-477 stores this as an untyped `metric_type` string plus a JSONB
 * `metric_value`, with no closed enum and no per-metric schema. Listed fields
 * are the names docs/05:601-611 returns and are the whole of the contract.
 *
 * NOTE: the dashboard is MVP Version 2 per docs/08:416-426, so no UI is built
 * for it yet. The type exists so the payload is not untyped when it arrives.
 */
export interface OrganizationDashboard {
  profile_views?: number;
  reviews?: number;
  rating_trends?: { period: string; average: number }[];
  customer_sentiment?: SentimentScore;
  competitor_position?: { organization_id: UUID; rank: number }[];
}
