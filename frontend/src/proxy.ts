import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIES, ROUTES } from "@/config/site-config";

/**
 * Route guard for the authenticated workspace.
 *
 * Next.js 16 renamed `middleware` to `proxy` and the runtime is Node.js with no
 * runtime override available. The presence of an access token is checked here
 * purely to decide the redirect; the token's validity and the user's role are
 * enforced by the backend, never here.
 *
 * `/admin` is in the list but its role check is NOT here. Distinguishing ADMIN
 * from CUSTOMER would mean verifying the JWT or calling `/users/profile/` on
 * every admin request, and this file deliberately does not decode tokens. The
 * admin layout guards the role client-side and each admin endpoint enforces it
 * server-side, which is the layer that actually has to be right.
 */
/**
 * Every page in the `(dashboard)` route group that still requires a session.
 *
 * Kept as an explicit list rather than matching the group, because a group is a
 * filesystem convention the proxy cannot see. The customer-facing read surfaces
 * (`/organizations`, `/organizations/{id}`, `/search`, `/comparison`) are
 * deliberately absent: a visitor without an account may browse the directory,
 * search, compare, and ask for AI recommendations — their endpoints are public
 * too. What remains behind login is the account area (`/profile`,
 * `/onboarding`), the legacy `/verification` redirect, and the admin workspace.
 */
const PROTECTED_PREFIXES = [
  "/services",
  "/analytics",
  "/verification",
  "/profile",
  "/onboarding",
  "/admin",
];

/**
 * Sub-paths of otherwise-public routes that stay behind login.
 *
 * `/organizations/{id}/analytics` is owner-only business intelligence, but the
 * profile around it is public — so a prefix match on `/organizations` cannot
 * guard it without also locking guests out of the directory. The analytics
 * segment is matched explicitly instead (and `/organizations/{id}` itself, with
 * nothing after it, stays public).
 */
const PROTECTED_PATTERNS: readonly RegExp[] = [
  /^\/organizations\/[^/]+\/analytics(?:\/|$)/,
];

const AUTH_ROUTES: readonly string[] = [ROUTES.login, ROUTES.register];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  /*
   * The value matters, not just the cookie's presence. A cleared session leaves
   * an empty `asip_access_token=` behind, and reading presence alone still calls
   * that "signed in": every `/login` visit would then 307 to `/organizations`,
   * so the "Sign in" button could never reach the sign-in form. An empty token
   * carries no credentials, so it must be treated as signed out.
   */
  const hasToken = Boolean(request.cookies.get(AUTH_COOKIES.accessToken)?.value);

  const isProtected =
    PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) || PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));

  if (isProtected && !hasToken) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_ROUTES.includes(pathname) && hasToken) {
    return NextResponse.redirect(new URL(ROUTES.organizations, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Negative matcher so static assets, images, and the API are never blocked.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
