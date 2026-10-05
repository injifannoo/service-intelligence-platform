import { PageHeader } from "@/components/shared/page-header";
import { SearchPanel } from "@/features/search";

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Find a service provider"
        description="Search verified organizations by what they offer, where they operate, and how customers rate them."
      />

      <SearchPanel />
    </div>
  );
}
