import { PageHeader } from "@/components/shared/page-header";
import { AiSearchPanels, SearchPanel } from "@/features/search";

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Find a service provider"
        description="Search verified organizations by what they offer, where they operate, and how customers rate them."
      />

      <section aria-labelledby="filters-heading" className="space-y-4">
        <h2 id="filters-heading" className="sr-only">
          Filter by keyword
        </h2>
        <SearchPanel />
      </section>

      <section aria-labelledby="ai-heading" className="space-y-4">
        <h2 id="ai-heading" className="sr-only">
          AI-assisted discovery
        </h2>
        <AiSearchPanels />
      </section>
    </div>
  );
}
