"use client";

import { useState } from "react";
import { InboxIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsPlatformAdmin } from "@/features/admin/api/use-admin";
import { StarRating } from "@/features/reviews";
import { ApiError } from "@/lib/api-client";
import { REVIEW_REPORT_REASONS } from "@/types";
import type { ModerationReport } from "@/types";

import { useDecideModeration, useModerationReports } from "../api/use-admin";

/**
 * Reported reasons that mean the review itself has to go rather than just the
 * report. The vocabulary is `REVIEW_REPORT_REASONS` (src/types), so this stays
 * in step with whatever the report dialog offers.
 */
const REMOVAL_REASONS = new Set(["SPAM", "OFFENSIVE", "FAKE"]);

function reasonLabel(reason: string) {
  const known = REVIEW_REPORT_REASONS.find(
    (candidate) => candidate.toLowerCase() === reason.toLowerCase(),
  );
  return known ?? reason;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

/**
 * The abuse-reporting queue: docs/02:127 ("manual abuse reporting queues to
 * catch spam or fraudulent reviews") and docs/02:314-315 ("Reviews are
 * moderated" / "Fraudulent reviews are removed").
 *
 * Every entry offers both outcomes because docs/02 requires moderation but
 * nowhere asserts that every report is valid — a report can be dismissed
 * without punishing the author.
 *
 * `enabled` comes from `useIsPlatformAdmin` so an admin-only request is never
 * issued before the role is known; the endpoint enforces the role regardless.
 */
export function ModerationQueue({ enabled }: { enabled: boolean }) {
  const reportsQuery = useModerationReports(enabled);
  const decide = useDecideModeration();
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);

  if (!enabled) return null;

  async function handleDecision(id: string, action: "DISMISS" | "REMOVE") {
    setError(null);
    setResolved(null);
    try {
      await decide.mutateAsync({ id, action });
      setResolved(id);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Moderation failed.");
    }
  }

  if (reportsQuery.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (reportsQuery.isError) {
    return (
      <AlertMessage tone="error">
        {reportsQuery.error instanceof Error
          ? reportsQuery.error.message
          : "Failed to load reported reviews."}
      </AlertMessage>
    );
  }

  const reports = reportsQuery.data?.data ?? [];

  return (
    <div className="space-y-4">
      {error && <AlertMessage tone="error">{error}</AlertMessage>}

      {reports.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
          <InboxIcon className="size-7 text-muted-foreground" />
          <p className="text-sm font-medium">Nothing to moderate</p>
          <p className="text-sm text-muted-foreground">
            No reviews have been reported.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((entry) => (
            <ModerationRow
              key={entry.review_id}
              entry={entry}
              pending={decide.isPending}
              resolved={resolved === entry.review_id}
              onDecide={handleDecision}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ModerationRow({
  entry,
  pending,
  resolved,
  onDecide,
}: {
  entry: ModerationReport;
  pending: boolean;
  resolved: boolean;
  onDecide: (id: string, action: "DISMISS" | "REMOVE") => void;
}) {
  const reason = reasonLabel(entry.reason);
  const offersRemoval = REMOVAL_REASONS.has(entry.reason.toUpperCase());

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{entry.organization_name ?? "Unknown organization"}</p>
        <Badge variant={offersRemoval ? "destructive" : "warning"}>{reason}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          Reported {formatDate(entry.reported_at)}
        </span>
      </div>

      <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StarRating rating={entry.review.rating} />
          <span className="text-muted-foreground">
            {entry.review.author_name ?? "Customer"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(entry.review.created_at)}
          </span>
        </div>
        {entry.review.comment && <p className="mt-2">{entry.review.comment}</p>}
      </div>

      {entry.note && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Reporter note:</span>{" "}
          {entry.note}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending || resolved}
          onClick={() => onDecide(entry.review_id, "DISMISS")}
        >
          <ShieldCheckIcon />
          {resolved ? "Resolved" : "Dismiss report"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending || resolved}
          onClick={() => onDecide(entry.review_id, "REMOVE")}
        >
          <Trash2Icon />
          Remove review
        </Button>
      </div>
    </li>
  );
}

/**
 * Moderation queue for the admin area.
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION — `docs/05_API_Design.md` documents
 * `POST /api/v1/reviews/{id}/` reporting but no way to list or resolve those
 * reports, while `docs/02:127` and `docs/09` Sprint 6:358 both require the
 * workflow. See `src/app/api/v1/admin/reports/route.ts`.
 */
export function AdminModeration() {
  const isAdmin = useIsPlatformAdmin();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Reported reviews</h2>
        <p className="text-sm text-muted-foreground">
          Dismiss a report that is not actionable, or remove the review when it is
          spam, abusive, or fabricated.
        </p>
      </div>
      <ModerationQueue enabled={isAdmin} />
    </section>
  );
}
