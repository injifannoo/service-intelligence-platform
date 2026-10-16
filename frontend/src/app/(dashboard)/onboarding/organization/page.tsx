import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { OrganizationOnboarding } from "@/features/organizations";

export const metadata: Metadata = {
  title: "Register your business",
};

/**
 * Step 2 of business onboarding (docs/09:256-278). Guarded by `proxy.ts`; the
 * page itself stays a thin controller that composes the feature UI.
 */
export default function OrganizationOnboardingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Set up your business profile"
        description="Add the details customers will see. You can refine everything later."
      />

      <OrganizationOnboarding />
    </div>
  );
}
