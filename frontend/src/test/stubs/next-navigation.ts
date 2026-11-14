/**
 * Minimal `next/navigation` replacement for Vitest, which has no Next router.
 *
 * Components under test should mock the hooks they care about. These defaults
 * keep the rest of a tree renderable: link navigation is a no-op and the
 * current location is the site root.
 */
const noop = () => undefined;

export const useRouter = () => ({
  push: noop,
  replace: noop,
  refresh: noop,
  back: noop,
  forward: noop,
  prefetch: noop,
});

const emptySearchParams = new URLSearchParams();

export const useSearchParams = () => emptySearchParams;

export const usePathname = () => "/";

export const useParams = () => ({});

export const useSelectedLayoutSegment = () => null;

export const useSelectedLayoutSegments = () => [];

export const redirect = noop;

export const notFound = noop;
