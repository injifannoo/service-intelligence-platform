import { PageHeader } from "@/components/shared/page-header";
import { AdminAuditLogs } from "@/features/admin/components/admin-verification";

export default function AdminAuditLogsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit log"
        description="Every privileged and content-changing action, newest first."
      />

      <AdminAuditLogs />
    </div>
  );
}
