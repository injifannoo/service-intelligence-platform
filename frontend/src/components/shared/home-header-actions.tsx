"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboardIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ADMIN_ROLES, landingRouteForRole, ROUTES } from "@/config/site-config";
import { useCurrentUser, useLogout } from "@/features/authentication";
import { tokenStore } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Auth-aware actions for the marketing header.
 *
 * The homepage header used to render a static "Sign in / Get started" pair, so a
 * signed-in visitor was offered the two links that were least useful to them.
 * Offering a signed-in user "Sign in" is actively misleading: the proxy bounces
 * them straight back out of `/login`.
 *
 * Both CTAs link to the dedicated `/login` and `/register` pages rather than
 * opening the auth modal over the page the visitor is reading.
 */
export function HomeHeaderActions() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { data: user, isPending, isFetching, isError } = useCurrentUser();
  const logout = useLogout();

  const publicCtas = (
    <>
      <Button asChild variant="outline" size="sm">
        <Link href={ROUTES.login}>Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href={ROUTES.register}>Get started</Link>
      </Button>
    </>
  );

  /*
   * Session state cannot be known on the server: the access token lives in a
   * cookie that never reaches the render. The public CTAs are therefore the only
   * first-render answer that is right for both sides, which keeps hydration in
   * agreement *and* leaves the sign-in links in the static HTML for crawlers and
   * no-JS clients.
   *
   * `hydrated` is false for the server render and for the hydration render, so
   * this returns identical markup for both and only afterwards is the real
   * session consulted.
   */
  if (!hydrated) {
    return publicCtas;
  }

  /*
   * A cookie does not mean a signed-in visitor *yet*. Until the profile request
   * settles the only honest answer is "working on it": offering "Sign in" here
   * used to be the common case, because `!user` covered the whole in-flight
   * window, and a click during that window lands on `/organizations` instead of
   * the login form — the cookie makes the proxy bounce it.
   *
   * `isError` breaks the tie the other way: the session is dead and the cookie is
   * being cleared, so fall through to the CTAs rather than parking on a skeleton.
   */
  const sessionCookie = tokenStore.getAccessToken() !== null;
  if (sessionCookie && !isError && !user) {
    return <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />;
  }

  if (!user) {
    return publicCtas;
  }

  // Reserves the header's space rather than showing a CTA that would flicker
  // into the signed-in menu a moment later.
  if (isPending || isFetching) {
    return <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />;
  }

  const isAdmin = ADMIN_ROLES.includes(user.role);

  async function handleLogout() {
    await logout.mutateAsync();
    router.push(ROUTES.home);
  }

  return (
    <>
      {isAdmin && (
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.admin}>
            <ShieldCheckIcon aria-hidden="true" />
            Admin area
          </Link>
        </Button>
      )}
      <Button asChild size="sm">
        <Link href={landingRouteForRole(user.role)}>
          <LayoutDashboardIcon aria-hidden="true" />
          Dashboard
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        onClick={handleLogout}
        disabled={logout.isPending}
        aria-label="Sign out"
      >
        <LogOutIcon />
      </Button>
    </>
  );
}
