import { PageHeader } from "@/components/shared/page-header";
import { ComparisonBuilder } from "@/features/comparison";

export default function ComparisonPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Compare organizations"
        description="Put up to four providers side by side to see how they differ."
      />

      <ComparisonBuilder />
    </div>
  );
}
