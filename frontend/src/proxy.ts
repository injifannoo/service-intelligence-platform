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
 * Every page in the `(dashboard)` route group.
 *
 * Kept as an explicit list rather than matching the group, because a group is a
 * filesystem convention the proxy cannot see. `/search` and `/comparison` were
 * previously unguarded even though both call authenticated endpoints
 * (`POST /search/ai/`, `POST /comparison/`), which left those surfaces rendering
 * inline 401 errors instead of redirecting to login.
 */
const PROTECTED_PREFIXES = [
  "/organizations",
  "/services",
  "/analytics",
  "/verification",
  "/search",
  "/comparison",
  "/profile",
  "/admin",
];

const AUTH_ROUTES: readonly string[] = [ROUTES.login, ROUTES.register];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(AUTH_COOKIES.accessToken);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

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
