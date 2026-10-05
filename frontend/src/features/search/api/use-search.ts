"use client";

import { useQuery } from "@tanstack/react-query";

import { searchApi, type SearchFilters } from "./search";

/**
 * Query keys.
 *
 * Kept under its own root rather than reusing `organizationKeys.list` so search
 * results and the browse list cannot satisfy each other — they are different
 * endpoints with different ranking.
 */
export const searchKeys = {
  all: ["search"] as const,
  list: (filters: SearchFilters) => [...searchKeys.all, "list", filters] as const,
};

export function useSearch(filters: SearchFilters) {
  return useQuery({
    queryKey: searchKeys.list(filters),
    queryFn: () => searchApi.list(filters),
    placeholderData: (previous) => previous,
  });
}
