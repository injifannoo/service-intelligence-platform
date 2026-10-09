"use client";

import { AuditLogTable, VerificationQueue } from "@/features/verification";

import { useIsPlatformAdmin } from "../api/use-admin";

/**
 * Verification queue for the admin area.
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION — `docs/05_API_Design.md` documents
 * no admin verification endpoint, yet `docs/08_Development_Roadmap.md:408` lists
 * this as an MVP Version 1 requirement. See
 * `src/features/verification/api/get-verification.ts`.
 */
export function AdminVerification() {
  const isAdmin = useIsPlatformAdmin();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Verification requests</h2>
        <p className="text-sm text-muted-foreground">
          Review the business documents organizations have submitted.
        </p>
      </div>
      <VerificationQueue enabled={isAdmin} />
    </section>
  );
}

/** Audit trail for the admin area. */
export function AdminAuditLogs() {
  const isAdmin = useIsPlatformAdmin();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Audit log</h2>
        <p className="text-sm text-muted-foreground">
          A record of privileged and content-changing actions.
        </p>
      </div>
      <AuditLogTable enabled={isAdmin} />
    </section>
  );
}
