import { AdminVerification } from "@/features/admin/components/admin-verification";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminVerificationPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Verification queue"
        description="Approve or reject organization verification claims."
      />

      <AdminVerification />
    </div>
  );
}
