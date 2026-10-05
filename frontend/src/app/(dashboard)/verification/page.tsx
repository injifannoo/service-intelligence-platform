import { PageHeader } from "@/components/shared/page-header";
import { AdminPanel } from "@/features/verification";

export default function VerificationPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Verification & moderation"
        description="Approve organization verification and inspect the audit trail."
      />

      <AdminPanel />
    </div>
  );
}
