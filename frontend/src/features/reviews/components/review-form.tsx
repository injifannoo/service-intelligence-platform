"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/shared/alert-message";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";

import { useCreateReview } from "../api/use-reviews";
import { RatingInput } from "./star-rating";

/**
 * Review submission form.
 *
 * docs/05_API_Design.md:406-421 takes `organization_id`, `rating`, and an
 * optional `comment`, and the endpoint requires authentication.
 */
export function ReviewForm({ organizationId }: { organizationId: string }) {
  const createReview = useCreateReview(organizationId);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    try {
      await createReview.mutateAsync({
        organization_id: organizationId,
        rating,
        comment: comment.trim() || undefined,
      });
      setRating(0);
      setComment("");
      setSubmitted(true);
    } catch (error) {
      setSubmitted(false);
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Write a review</CardTitle>
        <CardDescription>
          Share your experience to help other customers choose well.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

          {submitted && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              <CheckCircle2Icon className="size-4 shrink-0" />
              Thanks — your review has been published.
            </p>
          )}

          <RatingInput
            name="review-rating"
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
            <Label htmlFor="review-comment">Comment</Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              placeholder="What went well? What could be better?"
              aria-invalid={Boolean(fieldErrors.comment)}
            />
            {fieldErrors.comment?.map((message) => (
              <p key={message} className="text-xs text-destructive">
                {message}
              </p>
            ))}
          </div>

          <Button type="submit" disabled={createReview.isPending}>
            {createReview.isPending ? "Publishing…" : "Publish review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
