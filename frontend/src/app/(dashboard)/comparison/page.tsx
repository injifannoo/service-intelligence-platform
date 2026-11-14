import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ComparisonBuilder } from "@/features/comparison";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComparisonPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Compare organizations"
        description="Put up to four providers side by side to see how they differ."
      />

      {/* `ComparisonBuilder` reads `?orgs=` from the URL, which opts it into a
          client-side bailout. Without this boundary `next build` fails to
          prerender /comparison. */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ComparisonBuilder />
      </Suspense>
    </div>
  );
}
