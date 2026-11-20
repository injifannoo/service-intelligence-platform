import { ShieldCheck, ShieldQuestion } from "lucide-react";
import { hasConfirmedVerification, type VerificationProof } from "../types/verification";

const LABELS: Record<string, string> = {
  email: "Email confirmed · purchase not verified",
  phone: "Phone confirmed · purchase not verified",
  fayda: "Fayda identity confirmed · purchase not verified",
  purchase: "Purchase verified",
};

export function ReviewVerification({ proof }: { proof: VerificationProof }) {
  const confirmed = hasConfirmedVerification(proof);
  const Icon = confirmed ? ShieldCheck : ShieldQuestion;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${confirmed ? "text-success" : "text-muted-foreground"}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {confirmed ? LABELS[proof.verification] : "Identity and purchase not verified"}
    </span>
  );
}