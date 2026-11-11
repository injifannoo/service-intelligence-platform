export type VerificationProof = {
  verification: string;
  verification_confirmed_at?: string | null;
  verification_source?: string | null;
};

/** Legacy labels alone are not evidence of identity or a transaction. */
export function hasConfirmedVerification(proof: VerificationProof): boolean {
  if (!proof.verification_confirmed_at || !Number.isFinite(Date.parse(proof.verification_confirmed_at))) return false;
  const sources: Record<string, string> = {
    email: "auth_email", phone: "auth_phone", fayda: "fayda_provider", purchase: "purchase_evidence",
  };
  return sources[proof.verification] === proof.verification_source && !!sources[proof.verification];
}