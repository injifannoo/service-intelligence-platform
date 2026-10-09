/**
 * Public API surface for the verification slice.
 *
 * Features are consumed exclusively through this barrel
 * (docs/07_Project_Structure.md:219).
 */
export { AuditLogTable } from "./components/audit-log-table";
export { VerificationClaimForm } from "./components/verification-claim-form";
export { VerificationQueue } from "./components/verification-queue";

export { verificationApi } from "./api/get-verification";
export {
  useAuditLogs,
  useDecideVerification,
  useSubmitVerificationClaim,
  useVerificationClaims,
  verificationKeys,
} from "./api/use-verification";

export type {
  AuditLog,
  VERIFICATION_DOCUMENT_TYPES,
  VERIFICATION_STATUS_LABELS,
  VerificationClaim,
  VerificationClaimInput,
  VerificationDocumentType,
  VerificationStatus,
} from "./types";
