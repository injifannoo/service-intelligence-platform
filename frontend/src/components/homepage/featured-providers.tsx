"use client";

import Link from "next/link";
import { ArrowRightIcon, Building2Icon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/site-config";
import {
  OrganizationCard,
  OrganizationCardSkeleton,
  useOrganizations,
} from "@/features/organizations";

/**
 * Featured providers.
 *
 * Reads the real organization list, so every card, rating and verification
 * badge is backed by the database. When the directory is empty an empty state
 * is shown rather than invented demo businesses.
 */
export function FeaturedProviders() {
  const { data, isPending, isError, error, refetch } = useOrganizations({
    page_size: 6,
  });

  const organizations = data?.data ?? [];

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-16 sm:py-20">
      <SectionHeading
        eyebrow="Directory"
        title="Featured Service Providers"
        description="Discover top-rated and trusted service providers in your area."
        action={
          <Button asChild variant="outline">
            <Link href={ROUTES.organizations}>
              View All Providers
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      {isPending && (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <OrganizationCardSkeleton />
          <OrganizationCardSkeleton />
          <OrganizationCardSkeleton />
        </div>
      )}

      {isError && (
        <div className="mt-10">
          <AlertMessage tone="error" title="Could not load providers" className="flex-col items-start">
            <p>{error instanceof Error ? error.message : "Please try again."}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </AlertMessage>
        </div>
      )}

      {!isPending && !isError && organizations.length === 0 && (
        <div className="mt-10">
          <EmptyState
            icon={Building2Icon}
            title="No providers listed yet"
            description="Once businesses register and are verified, they will appear here."
          />
        </div>
      )}

      {organizations.length > 0 && (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((organization) => (
            <OrganizationCard key={organization.id} organization={organization} />
          ))}
        </div>
      )}
    </section>
  );
}
