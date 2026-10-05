"use client";

import { create } from "zustand";

/**
 * Ephemeral client UI state only.
 *
 * Deliberately does NOT hold the session or the user record — that is server
 * state and belongs to React Query (docs/07_Project_Structure.md:222-223).
 */
interface AuthUiState {
  /** Carried from the register form to the "check your inbox" state. */
  pendingVerificationEmail: string | null;
  setPendingVerificationEmail: (email: string | null) => void;
  clearPendingVerification: () => void;
}

export const useAuthUiStore = create<AuthUiState>()((set) => ({
  pendingVerificationEmail: null,
  setPendingVerificationEmail: (email) => set({ pendingVerificationEmail: email }),
  clearPendingVerification: () => set({ pendingVerificationEmail: null }),
}));
