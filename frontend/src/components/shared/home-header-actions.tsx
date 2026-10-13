"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboardIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ADMIN_ROLES, landingRouteForRole, ROUTES } from "@/config/site-config";
import { useCurrentUser, useLogout } from "@/features/authentication";
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
  const { data: user, isPending, isFetching } = useCurrentUser();
  const logout = useLogout();

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
  if (!hydrated || !user) {
    return (
      <>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.login}>Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={ROUTES.register}>Get started</Link>
        </Button>
      </>
    );
  }

  // `hydrated` and `user` are both settled from here on, so a pending profile
  // here means the client-side query is still loading.
  if (isPending || isFetching) {
    // Reserves the header's space rather than showing a CTA that would flicker
    // into the signed-in menu a moment later.
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
