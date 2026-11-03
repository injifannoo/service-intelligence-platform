"use client";

import { useOrganization } from "@/features/organizations";
import { OrganizationDashboardPanel } from "@/features/organizations";
import { useCurrentUser } from "@/features/authentication";
import { AlertMessage } from "@/components/shared/alert-message";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Owner analytics.
 *
 * MVP Version 2 (docs/08_Development_Roadmap.md:416-426).
 *
 * The guard is duplicated from the BFF on purpose: the route still renders for a
 * non-owner and explains why, rather than 403-ing on a hard navigation. The BFF
 * remains the authority — this only avoids showing a tab whose every request will
 * fail.
 */
export function OrganizationAnalytics({ organizationId }: { organizationId: string }) {
  const { data: currentUser } = useCurrentUser();
  const { data: organization, isPending } = useOrganization(organizationId);

  if (!currentUser || isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const isOwner = currentUser.organization_id === organizationId;
  const isAdmin =
    currentUser.role === "ADMIN" ||
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "MODERATOR";

  if (!isOwner && !isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Performance for your organization."
        />
        <AlertMessage tone="error" title="Not your dashboard">
          Analytics are visible only to the organization that owns this profile.
        </AlertMessage>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={
          organization
            ? `Performance for ${organization.name}.`
            : "Performance for your organization."
        }
      />

      {organization ? (
        <OrganizationDashboardPanel organization={organization} />
      ) : (
        <AlertMessage tone="error">This organization could not be found.</AlertMessage>
      )}
    </div>
  );
}
