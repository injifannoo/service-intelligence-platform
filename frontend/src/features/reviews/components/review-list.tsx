"use client";

import { useState } from "react";
import { FlagIcon, MessageSquareIcon } from "lucide-react";
import { AlertMessage } from "@/components/shared/alert-message";
import { EmptyState } from "@/components/shared/empty-state";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import {
  REVIEW_REPORT_REASONS,
  type OrganizationReview,
} from "@/types";

import { useOrganizationReviews, useReportReview } from "../api/use-reviews";
import { StarRating } from "./star-rating";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ReportDialog({
  reviewId,
  open,
  onOpenChange,
}: {
  reviewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reportReview = useReportReview("");

  const [reason, setReason] = useState<string>(REVIEW_REPORT_REASONS[0]);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      await reportReview.mutateAsync({ id: reviewId, reason, note: note || undefined });
      setDone(true);
    } catch (error) {
      setDone(false);
      setFormError(
        error instanceof ApiError ? error.message : "Could not report this review.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this review</DialogTitle>
          <DialogDescription>
            Reports are reviewed by an administrator. Misleading or abusive reviews
            are removed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <AlertMessage tone="error">{formError}</AlertMessage>}
          {done && (
            <AlertMessage tone="success">Report submitted. Thank you.</AlertMessage>
          )}

          <div className="space-y-2">
            <Label htmlFor="report-reason">Reason</Label>
            <Select
              id="report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {REVIEW_REPORT_REASONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-note">Additional detail</Label>
            <Textarea
              id="report-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={reportReview.isPending || done}>
              {reportReview.isPending ? "Submitting…" : "Submit report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewList({ organizationId }: { organizationId: string }) {
  const { data, isPending, isError, error } = useOrganizationReviews(organizationId);
  const [reportingId, setReportingId] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (isError) {
    return (
      <AlertMessage tone="error">
        {error instanceof Error ? error.message : "Failed to load reviews."}
      </AlertMessage>
    );
  }

  const reviews: OrganizationReview[] = data ?? [];

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareIcon}
        title="No reviews yet"
        description="Be the first to share your experience."
      />
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex flex-wrap items-center gap-3">
            <StarRating rating={review.rating} />
            <span className="text-sm font-medium">{review.author_name}</span>
            {review.verified && <Badge variant="success">Verified customer</Badge>}
            <span className="ml-auto text-xs text-muted-foreground">
              {formatDate(review.created_at)}
            </span>
          </div>

          {review.comment && (
            <p className="mt-3 text-sm leading-relaxed">{review.comment}</p>
          )}

          <div className="mt-3 flex items-center gap-2 border-t border-border pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setReportingId(review.id)}
            >
              <FlagIcon />
              Report
            </Button>
          </div>

          {reportingId === review.id && (
            <ReportDialog
              reviewId={review.id}
              open
              onOpenChange={(open) => !open && setReportingId(null)}
            />
          )}
        </article>
      ))}
    </div>
  );
}
