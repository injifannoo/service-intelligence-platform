import { PageHeader } from "@/components/shared/page-header";
import { ProfilePanel } from "@/features/authentication";

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Your profile"
        description="Manage the account details you sign in with."
      />

      <ProfilePanel />
    </div>
  );
}
