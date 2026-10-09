import { PageHeader } from "@/components/shared/page-header";
import { AdminHomepageSettings } from "@/features/admin/components/homepage-settings";

export default function AdminHomepageSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Homepage"
        description="Control which sections appear on the public homepage."
      />

      <AdminHomepageSettings />
    </div>
  );
}