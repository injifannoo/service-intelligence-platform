import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  failure,
  FieldErrors,
  num,
  ok,
  readJson,
  readRatingScores,
  requireUser,
  str,
} from "@/lib/dev-backend/http";
import {
  deleteReview,
  findReview,
  recordAudit,
  updateReview,
} from "@/lib/dev-backend/store";

/**
 * Authorization shared by PUT and DELETE.
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION — docs/05_API_Design.md documents
 * only `POST /reviews/`, `GET /organizations/{id}/reviews/` and
 * `POST /reviews/{id}/report/`, so neither verb has a contract to follow; the
 * `{id}` resource follows docs/05:239-245, which lists PUT and DELETE among
 * the standard methods. The body accepts the same `rating` and `comment` keys
 * as `POST /reviews/`.
 *
 * Editing and deleting are the author's alone, not an administrator's.
 * docs/02:314 makes moderation a queue ("Reviews are moderated"), and an admin
 * who could rewrite a review's text here would bypass it; removal for a
 * moderator goes through `POST /admin/reports/{id}/` with `REMOVE`, which is
 * audited as `review.removed`. Keeping the two verbs apart also means the
 * audit trail says whether a review was edited by its author or removed by a
 * moderator.
 */
function authorize(
  request: NextRequest,
  id: string,
): { user: { id: string } } | { response: Response } {
  const auth = requireUser(request);
  if ("response" in auth) return { response: auth.response };

  const review = findReview(id);
  if (!review) {
    return { response: failure(404, "NOT_FOUND", "Review not found.") };
  }

  if (review.user_id !== auth.user.id) {
    return {
      response: failure(403, "PERMISSION_DENIED", "You can only change your own review."),
    };
  }

  return { user: auth.user };
}

/** PUT /api/v1/reviews/{id}/ — docs/02:181 ("Edit review"). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const { id } = await params;

  const access = authorize(request, id);
  if ("response" in access) return access.response;

  const body = await readJson(request);
  if (!body) {
    return failure(400, "INVALID_PAYLOAD", "A JSON body is required.");
  }

  const errors = new FieldErrors();

  const rating = body.rating === undefined ? undefined : num(body.rating);
  if (body.rating !== undefined) {
    if (rating === undefined || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      // docs/04:350 types this Integer and never states the range; 1-5 is an
      // assumption recorded in src/types/index.ts contradiction 4.
      errors.add("rating", "Rating must be a whole number between 1 and 5.");
    }
  }

  // `comment` is nullable on purpose (docs/04:351 allows a rating-only review),
  // so null clears it while an absent key leaves it alone — the difference that
  // makes a rating-only edit safe.
  let comment: string | null | undefined;
  if ("comment" in body) {
    if (body.comment === null) {
      comment = null;
    } else {
      const text = str(body.comment);
      if (text === undefined) {
        errors.add("comment", "Enter text, or send null to clear it.");
      } else {
        comment = text.trim();
      }
    }
  }

  const ratings = readRatingScores(body.ratings, errors);

  if (!errors.isEmpty) return errors.toResponse();

  if (rating === undefined && comment === undefined && ratings === undefined) {
    return failure(400, "INVALID_PAYLOAD", "Provide `rating`, `ratings`, `comment`, or any combination.");
  }

  const updated = updateReview(id, { rating, comment, ratings });
  if (!updated) {
    return failure(404, "NOT_FOUND", "Review not found.");
  }

  recordAudit({ user_id: access.user.id, action: "review.updated", resource_id: id });

  return ok(updated);
}

/** DELETE /api/v1/reviews/{id}/ — docs/02:182 ("Delete review"). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const { id } = await params;

  const access = authorize(request, id);
  if ("response" in access) return access.response;

  deleteReview(id);
  recordAudit({ user_id: access.user.id, action: "review.deleted", resource_id: id });

  return ok({ message: "Review deleted" });
}
