"use client";

import { SearchXIcon, SearchIcon, XIcon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useOrganizations } from "../api/use-organization";
import { useOrganizationUiStore } from "../store/organization-store";
import { OrganizationCard, OrganizationCardSkeleton } from "./organization-card";

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

export function OrganizationList() {
  const filters = useOrganizationUiStore((state) => state.filters);
  const setFilters = useOrganizationUiStore((state) => state.setFilters);
  const resetFilters = useOrganizationUiStore((state) => state.resetFilters);
  const openCreateForm = useOrganizationUiStore(
    (state) => state.openCreateForm,
  );

  const { data, isPending, isError, error, refetch } = useOrganizations(filters);

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SKELETON_KEYS.map((key) => (
          <OrganizationCardSkeleton key={key} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <AlertMessage
        tone="error"
        title="Could not load organizations"
        className="flex-col items-start"
      >
        <p>{error instanceof Error ? error.message : "Please try again."}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </AlertMessage>
    );
  }

  const organizations = data?.data ?? [];
  const hasFilters = Boolean(filters.search || filters.location);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={filters.search ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, search: event.target.value || undefined })
            }
            placeholder="Search organizations"
            aria-label="Search organizations"
            className="max-w-xs pl-9"
          />
        </div>

        <Input
          value={filters.location ?? ""}
          onChange={(event) =>
            setFilters({ ...filters, location: event.target.value || undefined })
          }
          placeholder="Location"
          aria-label="Filter by location"
          className="max-w-[12rem]"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <XIcon />
            Clear
          </Button>
        )}

        {data?.pagination && (
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            {data.pagination.count} result
            {data.pagination.count === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {organizations.length === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title="No organizations found"
          description={
            hasFilters
              ? "Try a different search term or location, or clear the filters."
              : "Register the first organization to get started."
          }
          action={
            <>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              )}
              <Button size="sm" onClick={openCreateForm}>
                Register organization
              </Button>
            </>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((organization) => (
            <OrganizationCard key={organization.id} organization={organization} />
          ))}
        </div>
      )}
    </div>
  );
}
