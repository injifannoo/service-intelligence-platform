"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { AlertMessage } from "@/components/shared/alert-message";
import { Button } from "@/components/ui/button";
import { DASHBOARD_NAV, ROUTES } from "@/config/site-config";
import { useCurrentUser, useLogout } from "@/features/authentication";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

function canSee(item: { roles?: readonly UserRole[] }, role: UserRole | undefined) {
  return !item.roles || (role !== undefined && item.roles.includes(role));
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  const initials = user?.name
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
          {DASHBOARD_NAV.filter((item) => canSee(item, user?.role)).map((item) => {
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
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={ROUTES.profile}>
                  <span
                    aria-hidden="true"
                    className="grid size-6 place-items-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary"
                  >
                    {initials}
                  </span>
                  {user.name}
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
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
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
