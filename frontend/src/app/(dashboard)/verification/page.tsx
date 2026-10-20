"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ADMIN_ROLES, ROUTES } from "@/config/site-config";
import { useCurrentUser } from "@/features/authentication";

/**
 * The verification queue is admin-only, so it now lives under `/admin`.
 *
 * Kept as a redirect rather than deleted: bookmarks and audit-log links point
 * here, and a 404 would look like data loss.
 *
 * Role-aware, because the old customer queue has no replacement. Sending a
 * non-admin to `/admin/verification` would drop them on the admin shell's
 * "Not permitted" screen; admins still land on the queue they came for, while
 * everyone else goes to their own dashboard.
 *
 * The redirect is client-side because the access token lives in a cookie the
 * server cannot read, so the role is only known once the profile request
 * resolves. The page renders nothing in the meantime.
 */
export default function VerificationRedirectPage() {
  const router = useRouter();
  const { data: user, isPending, isError } = useCurrentUser();

  useEffect(() => {
    if (isPending) return;

    const role = isError ? undefined : user?.role;
    const isAdmin = role !== undefined && ADMIN_ROLES.includes(role);

    router.replace(isAdmin ? ROUTES.adminVerification : ROUTES.organizations);
  }, [isPending, isError, user, router]);

  return null;
}
