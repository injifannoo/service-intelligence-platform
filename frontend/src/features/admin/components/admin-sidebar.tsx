"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BuildingIcon,
  ClipboardCheckIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldAlertIcon,
  UsersIcon,
} from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { BrandMark } from "@/components/shared/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV, ROUTES } from "@/config/site-config";
import { useCurrentUser, useLogout } from "@/features/authentication";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

/**
 * Icons per admin section.
 *
 * A map rather than storing component references in `site-config`, which is
 * imported by `proxy.ts` and must stay free of React imports.
 */
const NAV_ICONS = {
  "/admin": LayoutDashboardIcon,
  "/admin/users": UsersIcon,
  "/admin/homepage": SettingsIcon,
  "/admin/organizations": BuildingIcon,
  "/admin/moderation": ShieldAlertIcon,
  "/admin/verification": ClipboardCheckIcon,
  "/admin/audit-logs": ScrollTextIcon,
} as const;

function canSee(item: { roles?: readonly UserRole[] }, role: UserRole | undefined) {
  return !item.roles || (role !== undefined && item.roles.includes(role));
}

/** Longer paths first so `/admin` never wins a `startsWith` match. */
function isActive(pathname: string, href: string) {
  if (href === ROUTES.admin) return pathname === ROUTES.admin;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar for the admin workspace.
 *
 * Intentionally separate from the customer `Header`: an admin should not have to
 * navigate customer chrome to reach moderation, and customer surfaces should not
 * advertise admin links.
 *
 * Sections are filtered by role so a regular Admin never sees "Users & roles" â€”
 * clicking it would only produce a 403, since account and role management is the
 * Super Admin's exclusive capability.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  const role = user?.role;
  const visible = ADMIN_NAV.filter((item) => canSee(item, role));

  async function handleLogout() {
    await logout.mutateAsync();
    router.push(ROUTES.login);
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border bg-card/40 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <Link href={ROUTES.admin} className="rounded-lg outline-offset-4 hover:opacity-85">
          <BrandMark />
        </Link>
        <Badge variant="accent" className="shrink-0">
          Admin
        </Badge>
      </div>

      <nav aria-label="Admin sections" className="flex-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Workspace
        </p>
        <ul className="space-y-1">
          {visible.map((item) => {
            const Icon = NAV_ICONS[item.href as keyof typeof NAV_ICONS] ?? LayoutDashboardIcon;
            const active = isActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-1.5 left-0 w-1 rounded-full bg-primary transition-opacity",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-border p-3">
        {user && (
          <div className="px-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={handleLogout}
          disabled={logout.isPending}
        >
          <LogOutIcon aria-hidden="true" />
          Sign out
        </Button>
      </div>

      {logout.isError && (
        <div className="px-3 pb-3">
          <AlertMessage tone="error">
            {logout.error instanceof Error
              ? logout.error.message
              : "Could not sign you out. Please try again."}
          </AlertMessage>
        </div>
      )}
    </aside>
  );
}
