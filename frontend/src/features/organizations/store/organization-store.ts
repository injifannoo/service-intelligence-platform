"use client";

import { create } from "zustand";

import type { OrganizationFilters } from "@/types";

/**
 * Ephemeral UI state for the organizations slice.
 *
 * Organization records are server state and live in React Query. What lives
 * here is only what cannot be derived from the server: which filters the user
 * has dialled in, which cards are ticked for comparison, and whether the
 * create/edit dialog is open (docs/07_Project_Structure.md:223).
 */
interface OrganizationUiState {
  filters: OrganizationFilters;
  setFilters: (filters: OrganizationFilters) => void;
  resetFilters: () => void;

  /** Ids ticked for the comparison matrix, Sprint 7 (docs/09:378-381). */
  selectedIds: string[];
  toggleSelected: (id: string) => void;
  clearSelection: () => void;

  isFormOpen: boolean;
  editingId: string | null;
  openCreateForm: () => void;
  openEditForm: (id: string) => void;
  closeForm: () => void;
}

export const useOrganizationUiStore = create<OrganizationUiState>()((set) => ({
  filters: {},
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: {} }),

  selectedIds: [],
  toggleSelected: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((existing) => existing !== id)
        : [...state.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),

  isFormOpen: false,
  editingId: null,
  openCreateForm: () => set({ isFormOpen: true, editingId: null }),
  openEditForm: (id) => set({ isFormOpen: true, editingId: id }),
  closeForm: () => set({ isFormOpen: false, editingId: null }),
}));
