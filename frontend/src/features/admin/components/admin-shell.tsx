"use client";

import { AlertMessage } from "@/components/shared/alert-message";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ADMIN_ROLES } from "@/config/site-config";
import { useCurrentUser } from "@/features/authentication";
import type { UserRole } from "@/types";

import { AdminSidebar } from "./admin-sidebar";

/**
 * Guard for the admin workspace.
 *
 * Wraps the layout rather than being duplicated per page, so a new admin route
 * cannot forget it.
 *
 * Renders an explanation instead of redirecting: a hard navigation away would
 * leave a signed-in non-admin staring at the customer home with no explanation of
 * why `/admin` did not open. This is a convenience gate — every admin endpoint
 * enforces the role server-side, so bypassing this component grants nothing.
 */
function isAdmin(role: UserRole | undefined) {
  return role !== undefined && ADMIN_ROLES.includes(role);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: user, isPending, isError } = useCurrentUser();

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <AlertMessage tone="error" title="Could not verify your access">
          Your session could not be loaded. Sign in again to continue.
        </AlertMessage>
      </div>
    );
  }

  if (!isAdmin(user.role)) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <PageHeader title="Admin area" description="Restricted to platform administrators." />
        <AlertMessage tone="error" title="Not permitted">
          This account does not have administrator access. If you believe that is
          wrong, ask a Super Admin to review your role.
        </AlertMessage>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      <AdminSidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-7xl px-6 py-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
