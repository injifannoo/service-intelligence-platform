"use client";

import { create } from "zustand";

import type { SearchFilters } from "../api/search";

interface SearchUiState {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  reset: () => void;
}

const INITIAL_FILTERS: SearchFilters = { query: "" };

/**
 * Search UI state only.
 *
 * Server results stay in React Query (docs/07_Project_Structure.md:222-223);
 * this store holds the unsubmitted filter box values.
 */
export const useSearchUiStore = create<SearchUiState>()((set) => ({
  filters: INITIAL_FILTERS,
  setFilters: (filters) => set({ filters }),
  reset: () => set({ filters: INITIAL_FILTERS }),
}));
