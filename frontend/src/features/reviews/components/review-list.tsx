"use client";

import { useState } from "react";
import { FlagIcon, MessageSquareIcon, PencilIcon, Trash2Icon } from "lucide-react";
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
import { useCurrentUser } from "@/features/authentication";
import {
  REVIEW_REPORT_REASONS,
  type OrganizationReview,
} from "@/types";

import {
  useDeleteReview,
  useOrganizationReviews,
  useReportReview,
  useUpdateReview,
} from "../api/use-reviews";
import { RatingInput, StarRating } from "./star-rating";

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

/**
 * Edit own review — docs/02:181 ("Edit review").
 *
 * Seeded from the review being edited rather than cleared, because the common
 * case is a small change to text that is already there.
 */
function EditReviewDialog({
  organizationId,
  review,
  open,
  onOpenChange,
}: {
  organizationId: string;
  review: OrganizationReview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateReview = useUpdateReview(organizationId);

  const [rating, setRating] = useState(review.rating);
  const [comment, setComment] = useState(review.comment ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    try {
      await updateReview.mutateAsync({
        id: review.id,
        rating,
        comment: comment.trim() || null,
      });
      setDone(true);
    } catch (error) {
      setDone(false);
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Could not save this review.");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit your review</DialogTitle>
          <DialogDescription>
            Your rating and comment are shown to everyone considering this
            organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <AlertMessage tone="error">{formError}</AlertMessage>}
          {done && <AlertMessage tone="success">Review updated.</AlertMessage>}

          <RatingInput
            name="edit-review-rating"
            value={rating}
            onChange={setRating}
            invalid={Boolean(fieldErrors.rating)}
          />
          {fieldErrors.rating?.map((message) => (
            <p key={message} className="text-xs text-destructive">
              {message}
            </p>
          ))}

          <div className="space-y-2">
            <Label htmlFor="edit-review-comment">Comment</Label>
            <Textarea
              id="edit-review-comment"
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="What went well? What could be better?"
              aria-invalid={Boolean(fieldErrors.comment)}
            />
            {fieldErrors.comment?.map((message) => (
              <p key={message} className="text-xs text-destructive">
                {message}
              </p>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateReview.isPending || done}>
              {updateReview.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Delete own review — docs/02:182 ("Delete review").
 *
 * Confirmation rather than a bare click: a review cannot be restored once it is
 * gone, and the button sits next to Edit in a list the author scrolls through.
 */
function DeleteReviewDialog({
  organizationId,
  review,
  open,
  onOpenChange,
}: {
  organizationId: string;
  review: OrganizationReview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteReview = useDeleteReview(organizationId);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleDelete() {
    setFormError(null);

    try {
      await deleteReview.mutateAsync({ id: review.id });
      onOpenChange(false);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Could not delete this review.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this review?</DialogTitle>
          <DialogDescription>
            Your rating will be removed from this organization&apos;s average and
            the review cannot be restored.
          </DialogDescription>
        </DialogHeader>

        {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteReview.isPending}
          >
            {deleteReview.isPending ? "Deleting…" : "Delete review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewList({ organizationId }: { organizationId: string }) {
  const { data, isPending, isError, error } = useOrganizationReviews(organizationId);
  const { data: currentUser } = useCurrentUser();
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      {reviews.map((review) => {
        // Edit and delete are the author's alone (docs/02:181-182); everyone
        // else — including an administrator — gets the report action, because
        // moderation is a queue (docs/02:314) rather than an edit in place.
        const isAuthor = Boolean(currentUser && review.user_id === currentUser.id);

        return (
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
              {isAuthor ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setEditingId(review.id)}
                  >
                    <PencilIcon />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setDeletingId(review.id)}
                  >
                    <Trash2Icon />
                    Delete
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setReportingId(review.id)}
                >
                  <FlagIcon />
                  Report
                </Button>
              )}
            </div>

            {reportingId === review.id && (
              <ReportDialog
                reviewId={review.id}
                open
                onOpenChange={(open) => !open && setReportingId(null)}
              />
            )}
            {editingId === review.id && (
              <EditReviewDialog
                organizationId={organizationId}
                review={review}
                open
                onOpenChange={(open) => !open && setEditingId(null)}
              />
            )}
            {deletingId === review.id && (
              <DeleteReviewDialog
                organizationId={organizationId}
                review={review}
                open
                onOpenChange={(open) => !open && setDeletingId(null)}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}
