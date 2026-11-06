"use client";

import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { useCategories } from "../api/use-service";

interface ServiceCatalogFiltersProps {
  search: string;
  categoryId: string;
  /** Owners can also narrow the catalogue by active/inactive state. */
  status?: "all" | "active" | "inactive";
  showStatus?: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusChange?: (value: "all" | "active" | "inactive") => void;
}

/** Search and category controls shared by the catalogue and owner workspace. */
export function ServiceCatalogFilters({
  search,
  categoryId,
  status = "all",
  showStatus = false,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
}: ServiceCatalogFiltersProps) {
  const { data: categories = [], isPending } = useCategories();
  const hasFilters = Boolean(search) || Boolean(categoryId) || status !== "all";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label="Search services"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search services by name"
          className="pl-9"
        />
      </div>

      <div className="sm:w-60">
        <Select
          aria-label="Filter by category"
          value={categoryId}
          onChange={(event) => onCategoryChange(event.target.value)}
          disabled={isPending}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      {showStatus && onStatusChange && (
        <div className="sm:w-40">
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as "all" | "active" | "inactive")
            }
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSearchChange("");
            onCategoryChange("");
            onStatusChange?.("all");
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
