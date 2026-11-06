"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertMessage } from "@/components/shared/alert-message";
import { EmptyState } from "@/components/shared/empty-state";

import { useServices, useCategories } from "../api/use-service";
import { ServiceCard } from "./service-card";

/**
 * Public service catalogue — Sprint 4.
 *
 * A flat, filterable list of services across all organizations. Customers can
 * search by name, filter by category, and follow links to provider profiles.
 */
export function ServiceCatalogue() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [submittedCategoryId, setSubmittedCategoryId] = useState("");

  const { data: categories = [] } = useCategories();

  const { data, isPending, isError, error, refetch } = useServices({
    search: submittedSearch || undefined,
    category_id: submittedCategoryId || undefined,
    page_size: 100,
  });

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setSubmittedSearch(search);
    setSubmittedCategoryId(categoryId);
  }

  function handleClear() {
    setSearch("");
    setCategoryId("");
    setSubmittedSearch("");
    setSubmittedCategoryId("");
  }

  const services = data?.data ?? [];
  const hasFilters = submittedSearch !== "" || submittedCategoryId !== "";

  return (
    <div className="space-y-6">
      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="service-search" className="sr-only">
            Search services
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="service-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="sm:w-56">
          <label htmlFor="service-category-filter" className="sr-only">
            Filter by category
          </label>
          <Select
            id="service-category-filter"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="default">
            <SearchIcon className="size-4" />
            Search
          </Button>
          {hasFilters && (
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>
      </form>

      {/* Results */}
      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      )}

      {isError && (
        <AlertMessage tone="error" title="Could not load services">
          {error instanceof Error ? error.message : "Please try again."}
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </AlertMessage>
      )}

      {!isPending && !isError && services.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title={hasFilters ? "No services match your filters" : "No services listed yet"}
          description={
            hasFilters
              ? "Try adjusting your search or category filter."
              : "Once providers list their services, they will appear here."
          }
        />
      )}

      {!isPending && !isError && services.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {services.length} service{services.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                showOrganization
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
