"use client";

import { useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDownIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react";
import { QueryClientContext } from "@tanstack/react-query";

import { BrandMark } from "@/components/shared/brand-mark";
import { AlertMessage } from "@/components/shared/alert-message";
import { Button } from "@/components/ui/button";
import { DASHBOARD_NAV, ROUTES } from "@/config/site-config";
import { getCustomerTier, useCurrentUser, useLogout } from "@/features/authentication";
import { apiClient } from "@/lib/api-client";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { CUSTOMER_TIERS, CUSTOMER_TIER_LABELS, type CustomerTier, type UserProfile, type UserRole } from "@/types";

function canSee(item: { roles?: readonly UserRole[] }, role: UserRole | undefined) {
  return !item.roles || (role !== undefined && item.roles.includes(role));
}

/**
 * Header for the application shell.
 *
 * The customer-facing read surfaces (`/organizations`, `/search`, `/comparison`)
 * are browsable without a session, so a visitor who has not signed in still sees
 * this header — and gets a "Sign in / Get started" pair. A signed-in user gets
 * the account menu instead.
 *
 * The session is cookie-derived, so it is unknowable during SSR: the server
 * renders no user and the client renders the account menu, which is exactly the
 * mismatch that throws "Hydration failed". `useHydrated()` holds the session-
 * dependent pane back until the DOM the browser built can no longer be compared
 * against the server's.
 */
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const { data: user, isFetching } = useCurrentUser();
  const logout = useLogout();

  const session = hydrated ? user : undefined;
  const reservingSpace = hydrated && session === undefined && isFetching;

  const initials = session?.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await logout.mutateAsync();
    router.push(ROUTES.login);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-6">
        <Link
          href={ROUTES.organizations}
          className="rounded-lg outline-offset-4 transition-opacity hover:opacity-85"
        >
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {DASHBOARD_NAV.filter((item) => canSee(item, session?.role)).map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!hydrated || reservingSpace ? (
            <div className="h-8 w-32 animate-pulse rounded-md bg-muted" aria-hidden="true" />
          ) : session ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={ROUTES.profile}>
                  <span
                    aria-hidden="true"
                    className="grid size-6 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
                  >
                    {initials}
                  </span>
                  {session.name}
                </Link>
              </Button>
              <DemoTierDropdown user={session} />
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
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.login}>Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={ROUTES.register}>Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {logout.isError && (
        <div className="mx-auto w-full max-w-7xl px-6 pb-3">
          <AlertMessage tone="error">
            {logout.error instanceof Error
              ? logout.error.message
              : "Could not sign you out. Please try again."}
          </AlertMessage>
        </div>
      )}
    </header>
  );
}

function DemoTierDropdown({ user }: { user: UserProfile }) {
  const queryClient = useContext(QueryClientContext);
  const currentTier = getCustomerTier(user);

  async function handleTierChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newTier = event.target.value as CustomerTier;
    try {
      await apiClient.put<UserProfile>("/users/profile/", {
        name: user.name,
        email: user.email,
        customer_tier: newTier,
      });
      if (queryClient) {
        void queryClient.invalidateQueries({ queryKey: ["auth"] });
      }
    } catch {
      // Ignore in demo switcher
    }
  }

  // Only render for customer role
  if (user.role !== "CUSTOMER") return null;

  return (
    <div className="relative hidden items-center sm:inline-flex">
      <div className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground shadow-xs hover:bg-muted/60">
        <ShieldCheckIcon className="size-3.5 text-primary" aria-hidden="true" />
        <span>Demo: {CUSTOMER_TIER_LABELS[currentTier]}</span>
        <ChevronDownIcon className="size-3 text-muted-foreground" aria-hidden="true" />
      </div>
      <select
        aria-label="Demo Customer Tier Switcher"
        value={currentTier}
        onChange={handleTierChange}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="CUSTOMER">Demo: Customer (Max 2)</option>
        <option value="VERIFIED_CUSTOMER">Demo: Verified Customer (Max 4)</option>
        <option value="PREMIUM_CUSTOMER">Demo: Premium Customer (Max 10 + Export)</option>
      </select>
    </div>
  );
}

