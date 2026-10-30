"use client";

import { BuildingIcon, ExternalLinkIcon, StarIcon } from "lucide-react";
import Link from "next/link";

import { AlertMessage } from "@/components/shared/alert-message";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useOrganizations,
  VERIFICATION_BADGE_VARIANT,
  VERIFICATION_LABELS,
} from "@/features/organizations";
import type { Organization } from "@/types";

/**
 * Cross-tenant organization browser for admins.
 *
 * This is deliberately read-and-navigate rather than inline editing. Organization
 * edits are tenant-owned, and there is no admin-scoped override endpoint to back
 * an inline admin form; the claim decision itself belongs to the verification
 * queue, not here.
 *
 * Visibility is the point. A regular admin can reach any tenant's profile, which
 * the customer-side list never offers.
 */
export function AdminOrganizations() {
  const { data, isPending, isError, error } = useOrganizations({ page_size: 50 });

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Organizations" description="Every organization on the platform." />
        <AlertMessage tone="error" title="Could not load organizations">
          {error instanceof Error ? error.message : "Please try again."}
        </AlertMessage>
      </div>
    );
  }

  const organizations = data?.data ?? [];
  const count = data?.pagination?.count ?? organizations.length;
  const verified = organizations.filter(
    (organization) => organization.verification_status === "VERIFIED",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Every organization on the platform, including tenants you do not own."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Total organizations</p>
              <p className="text-xl font-semibold tabular-nums">{count}</p>
            </div>
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              <BuildingIcon className="size-4" aria-hidden="true" />
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Verified</p>
              <p className="text-xl font-semibold tabular-nums">{verified}</p>
              <p className="text-xs text-muted-foreground">of {count} total</p>
            </div>
            <span className="rounded-md bg-primary/10 p-1.5 text-primary">
              <StarIcon className="size-4" aria-hidden="true" />
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>
            {count} organization{count === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No organizations have registered yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {organizations.map((organization) => (
                <OrganizationRow key={organization.id} organization={organization} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationRow({ organization }: { organization: Organization }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
          <BuildingIcon className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-medium">{organization.name}</p>
          <p className="text-xs text-muted-foreground">
            {organization.location || "No location set"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {organization.rating !== null && (
          <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
            <StarIcon className="size-3 fill-warning text-warning" aria-hidden="true" />
            {organization.rating.toFixed(1)}
          </span>
        )}
        <Badge variant={VERIFICATION_BADGE_VARIANT[organization.verification_status]}>
          {VERIFICATION_LABELS[organization.verification_status]}
        </Badge>
        <Button asChild size="sm" variant="outline">
          <Link href={`/organizations/${organization.id}`}>
            Open
            <ExternalLinkIcon aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </li>
  );
}
