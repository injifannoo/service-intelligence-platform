"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the client has taken over from the server-rendered HTML.
 *
 * `false` during SSR and during the first client render, `true` from the next
 * render onwards.
 *
 * Session state is read from cookies via `tokenStore`, a client-only source. The
 * server cannot see an access token, so it has no way to know whether to render
 * the signed-out or the signed-in variant of a component. Rendering whichever one
 * the local environment happens to suggest makes the first client render disagree
 * with the server's HTML, and React responds by discarding the whole tree and
 * regenerating it on the client.
 *
 * This hook lets a component pick one variant for the server render and the
 * hydration render, then switch afterwards.
 *
 * `useSyncExternalStore` rather than the usual `useEffect` + `useState` mounted
 * flag. The hook exists for exactly the external-store case React built it for:
 * `getServerSnapshot` is the value used for both the server render and hydration,
 * which is the guarantee needed here. `subscribe` is a no-op because nothing in
 * this app mutates hydration state — the switch happens once, when React first
 * reads `getSnapshot` on the client after hydration commits.
 */

const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
