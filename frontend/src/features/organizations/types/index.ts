/**
 * Organization DTOs.
 *
 * The canonical entity shapes live in `src/types` because `api-client` and
 * more than one slice depend on them. They are re-exported here so this slice
 * is self-contained for consumers of its barrel
 * (docs/07_Project_Structure.md:219).
 */
export type {
  Industry,
  Organization,
  OrganizationFilters,
  OrganizationInput,
  Service,
  VerificationStatus,
} from "@/types";

/** Human-readable labels for the verification enum. */
export const VERIFICATION_LABELS: Record<
  import("@/types").VerificationStatus,
  string
> = {
  PENDING: "Pending verification",
  VERIFIED: "Verified",
  REJECTED: "Not verified",
};

/**
 * Badge tone per verification status.
 *
 * Lives next to `VERIFICATION_LABELS` because the admin area renders the same
 * three states. It was previously a private constant in `organization-card.tsx`,
 * which meant a second surface had to re-derive the mapping and could drift.
 */
export const VERIFICATION_BADGE_VARIANT: Record<
  import("@/types").VerificationStatus,
  "success" | "warning" | "muted"
> = {
  VERIFIED: "success",
  PENDING: "warning",
  REJECTED: "muted",
};
