import { vi } from "vitest";

/**
 * Test stub for `next/navigation`.
 *
 * The hooks return fixed values so a component rendering a pathname-dependent nav
 * or an active state is deterministic.
 *
 * `useRouter` and `useSearchParams` are backed by module-level singletons rather
 * than fresh objects per call. Without that, a test could not assert where a
 * component navigated to, because the `vi.fn()` recorded by the render under test
 * would not be the one it retrieved afterwards.
 */

const push = vi.fn();
const replace = vi.fn();

export const routerMock = { push, replace };

/** Overridable so a test can drive `usePathname` / `useSearchParams`. */
let pathname = "/organizations";
let searchParams = new URLSearchParams();

export function __setPathname(next: string) {
  pathname = next;
}

export function __setSearchParams(next: URLSearchParams | string) {
  searchParams = typeof next === "string" ? new URLSearchParams(next) : next;
}

export function __resetNavigation() {
  pathname = "/organizations";
  searchParams = new URLSearchParams();
  push.mockClear();
  replace.mockClear();
}

export const useRouter = () => ({
  push,
  replace,
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
});

export const usePathname = () => pathname;

export const useParams = () => ({} as Record<string, string | string[]>);

export const useSearchParams = () => searchParams;

export const redirect = vi.fn();
export const permanentRedirect = vi.fn();
export const notFound = vi.fn();
export const useSelectedLayoutSegment = () => null;
export const useSelectedLayoutSegments = () => [] as string[];
