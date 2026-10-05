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
