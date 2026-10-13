"use client";

import { useState } from "react";
import { CheckIcon, InboxIcon, XIcon } from "lucide-react";
import { AlertMessage } from "@/components/shared/alert-message";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { VERIFICATION_STATUS_LABELS } from "@/types";

import { useDecideVerification, useVerificationClaims } from "../api/use-verification";

const STATUS_VARIANT = {
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "destructive",
} as const;

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

/**
 * Admin verification queue.
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION — see `api/get-verification.ts`.
 * `enabled` is supplied by the caller so the admin-only request is never issued
 * for a customer session.
 */
export function VerificationQueue({ enabled }: { enabled: boolean }) {
  const claimsQuery = useVerificationClaims(enabled);
  const decide = useDecideVerification();
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  async function handleDecision(id: string, decision: "APPROVE" | "REJECT") {
    setError(null);
    try {
      await decide.mutateAsync({ id, decision });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Decision failed.");
    }
  }

  if (claimsQuery.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (claimsQuery.isError) {
    return (
      <AlertMessage tone="error">
        {claimsQuery.error instanceof Error
          ? claimsQuery.error.message
          : "Failed to load verification requests."}
      </AlertMessage>
    );
  }

  const claims = claimsQuery.data?.data ?? [];

  return (
    <div className="space-y-4">
      {error && <AlertMessage tone="error">{error}</AlertMessage>}

      {claims.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
          <InboxIcon className="size-7 text-muted-foreground" />
          <p className="text-sm font-medium">Nothing to review</p>
          <p className="text-sm text-muted-foreground">
            There are no verification requests in the queue.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {claims.map((claim) => (
            <li key={claim.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {claim.organization_name ?? "Unknown organization"}
                </p>
                <Badge variant={STATUS_VARIANT[claim.status]}>
                  {VERIFICATION_STATUS_LABELS[claim.status]}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  Submitted {formatDate(claim.created_at)}
                </span>
              </div>

              <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Document</dt>
                  <dd>{claim.document_type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Link</dt>
                  <dd className="truncate">
                    <a
                      href={claim.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Open document
                    </a>
                  </dd>
                </div>
              </dl>

              {claim.status === "PENDING" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => handleDecision(claim.id, "APPROVE")}
                  >
                    <CheckIcon />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={decide.isPending}
                    onClick={() => handleDecision(claim.id, "REJECT")}
                  >
                    <XIcon />
                    Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
