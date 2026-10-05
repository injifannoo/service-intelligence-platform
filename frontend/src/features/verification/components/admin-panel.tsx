"use client";

import { useCurrentUser } from "@/features/authentication";
import { AuditLogTable, VerificationQueue } from "@/features/verification";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Admin panel: verification queue and audit log.
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION — docs/05_API_Design.md documents no
 * admin endpoint, yet docs/08_Development_Roadmap.md:408 lists this as an MVP
 * Version 1 requirement. See `src/features/verification/api/get-verification.ts`.
 *
 * The requests are gated on the loaded role rather than on a route guard, so a
 * customer who reaches this URL sees an explanation instead of a failed fetch.
 */
export function AdminPanel() {
  const { data: user, isPending } = useCurrentUser();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  if (isPending) {
    return <Skeleton className="h-64" />;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-sm font-medium">Administrator access required</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This area is limited to platform administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Verification requests</h2>
          <p className="text-sm text-muted-foreground">
            Review the business documents organizations have submitted.
          </p>
        </div>
        <VerificationQueue enabled={isAdmin} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Audit log</h2>
          <p className="text-sm text-muted-foreground">
            A record of privileged and content-changing actions.
          </p>
        </div>
        <AuditLogTable enabled={isAdmin} />
      </section>
    </div>
  );
}
