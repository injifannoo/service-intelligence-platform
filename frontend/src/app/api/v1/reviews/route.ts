import type { NextRequest } from "next/server";

import {
  created,
  devBackendUnavailable,
  FieldErrors,
  failure,
  num,
  readJson,
  readRatingScores,
  requireUser,
  str,
} from "@/lib/dev-backend/http";
import { createReview, findOrganization, recordAudit } from "@/lib/dev-backend/store";

/**
 * POST /api/v1/reviews/ — docs/05_API_Design.md:406-421.
 *
 * `organization_id` is documented as `1` in the example payload, but docs/04
 * makes every primary key a UUID, so a UUID is required here.
 */
export async function POST(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) {
    return failure(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const organizationId = str(body.organization_id)?.trim();
  const rating = num(body.rating);
  const comment = str(body.comment)?.trim();

  const errors = new FieldErrors();
  if (!organizationId) {
    errors.add("organization_id", "This field is required.");
  }
  if (rating === undefined) {
    errors.add("rating", "This field is required.");
  } else if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    // docs/04:350 types this Integer and never states the range; 1-5 is an
    // assumption recorded in src/types/index.ts contradiction 4.
    errors.add("rating", "Rating must be a whole number between 1 and 5.");
  }
  const ratings = readRatingScores(body.ratings, errors);
  if (!errors.isEmpty) return errors.toResponse();

  if (!findOrganization(organizationId as string)) {
    return failure(404, "NOT_FOUND", "Organization not found.");
  }

  const review = createReview({
    organization_id: organizationId as string,
    user_id: auth.user.id,
    author_name: auth.user.name,
    rating: rating as number,
    comment,
    ratings,
  });

  recordAudit({
    user_id: auth.user.id,
    action: "review.created",
    resource_id: review.id,
  });

  return created(review);
}
