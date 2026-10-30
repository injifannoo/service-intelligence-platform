"use client";

import { useState, type FormEvent } from "react";
import { Loader2Icon, SearchIcon, SearchXIcon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { EmptyState } from "@/components/shared/empty-state";
import { OrganizationCard, OrganizationCardSkeleton } from "@/features/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PHASE_ONE_INDUSTRIES } from "@/config/site-config";

import { useSearch } from "../api/use-search";
import { useSearchUiStore } from "../store/search-store";

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  { value: "3", label: "3+ stars" },
  { value: "4", label: "4+ stars" },
  { value: "4.5", label: "4.5+ stars" },
];

/** Budget ceilings matched against the cheapest listed service. Contradiction 8: no currency. */
const PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "25", label: "Under 25" },
  { value: "100", label: "Under 100" },
  { value: "500", label: "Under 500" },
  { value: "1000", label: "Under 1,000" },
];

/**
 * Keyword search over organizations, docs/05_API_Design.md:446-459.
 *
 * Filters live in local component state and are only sent on submit, so
 * typing does not fire a request per keystroke.
 */
export function SearchPanel() {
  const filters = useSearchUiStore((state) => state.filters);
  const setFilters = useSearchUiStore((state) => state.setFilters);
  const reset = useSearchUiStore((state) => state.reset);

  const [query, setQuery] = useState(filters.query ?? "");
  const [industry, setIndustry] = useState(filters.industry ?? "");
  const [location, setLocation] = useState(filters.location ?? "");
  const [rating, setRating] = useState(
    filters.rating === undefined ? "" : String(filters.rating),
  );
  const [price, setPrice] = useState(
    filters.price === undefined ? "" : String(filters.price),
  );

  const { data, isPending, isFetching, isError, error, refetch } = useSearch(filters);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      query: query.trim() || undefined,
      industry: industry || undefined,
      location: location.trim() || undefined,
      rating: rating ? Number(rating) : undefined,
      price: price ? Number(price) : undefined,
    });
  }

  const results = data?.data ?? [];

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="search-query">What are you looking for?</Label>
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="search-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cloud migration, hotel, agency…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="search-industry">Industry</Label>
          <Select
            id="search-industry"
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
          >
            <option value="">All industries</option>
            {PHASE_ONE_INDUSTRIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="search-location">Location</Label>
          <Input
            id="search-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="City"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="search-rating">Minimum rating</Label>
          <Select
            id="search-rating"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
          >
            {RATING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="search-price">Maximum price</Label>
          <Select
            id="search-price"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          >
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit" loading={isFetching} className="flex-1">
            <SearchIcon />
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuery("");
              setIndustry("");
              setLocation("");
              setRating("");
              setPrice("");
              reset();
            }}
          >
            Clear
          </Button>
        </div>
      </form>

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OrganizationCardSkeleton />
          <OrganizationCardSkeleton />
          <OrganizationCardSkeleton />
        </div>
      )}

      {isError && (
        <AlertMessage tone="error" title="Search failed" className="flex-col items-start">
          <p>{error instanceof Error ? error.message : "Please try again."}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </AlertMessage>
      )}

      {!isPending && !isError && results.length === 0 && (
        <EmptyState
          icon={SearchXIcon}
          title="No matches"
          description="Try a broader term, or relax the filters."
        />
      )}

      {results.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isFetching && <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />}
            {data?.pagination
              ? `${data.pagination.count} result${data.pagination.count === 1 ? "" : "s"}`
              : `${results.length} result${results.length === 1 ? "" : "s"}`}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((organization) => (
              <OrganizationCard key={organization.id} organization={organization} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
