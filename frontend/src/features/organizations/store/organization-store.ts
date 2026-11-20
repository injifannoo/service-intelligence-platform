import { useSyncExternalStore } from "react";

/** Tiny client UI store (Zustand-compatible API) for ephemeral organization UI state. */
type State = { selectedSlug: string | null };
let state: State = { selectedSlug: null };
const subs = new Set<() => void>();
export const organizationStore = {
  get: () => state,
  set: (p: Partial<State>) => { state = { ...state, ...p }; subs.forEach((f) => f()); },
  subscribe: (f: () => void) => { subs.add(f); return () => subs.delete(f); },
};
export const useOrganizationStore = () => useSyncExternalStore(organizationStore.subscribe, organizationStore.get, organizationStore.get);
