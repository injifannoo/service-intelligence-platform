import { PageHeader } from "@/components/shared/page-header";
import { OrganizationForm, OrganizationList } from "@/features/organizations";

/**
 * Thin controller: no fetching, no state, no business logic — it only composes
 * the feature UI (docs/07_Project_Structure.md:218).
 */
export default function OrganizationsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Organizations"
        description="Discover and manage verified service providers."
      />

      <OrganizationList />
      <OrganizationForm />
    </div>
  );
}
