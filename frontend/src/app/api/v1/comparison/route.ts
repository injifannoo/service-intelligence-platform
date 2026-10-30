import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  FieldErrors,
  failure,
  ok,
  readJson,
  str,
} from "@/lib/dev-backend/http";
import {
  findOrganization,
  listReviews,
  listServices,
  reviewCountFor,
  withRating,
} from "@/lib/dev-backend/store";
import { analyzeSentiment } from "@/lib/dev-backend/ai";

/**
 * POST /api/v1/comparison/ — docs/05_API_Design.md:495-520.
 *
 * Request: `{ organizations: [uuid, ...], criteria: ["price", "rating", ...] }`.
 * The documented response is a single `comparison` key whose row shape is
 * unspecified by every document, so the rows carry the full organization plus a
 * per-organization service catalogue, which is what a comparison matrix needs
 * to render. Encapsulated in the standard envelope.
 *
 * Public: comparing providers is part of the guest experience, so no session is
 * required to build a matrix.
 */
export async function POST(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const body = await readJson(request);
  if (!body) {
    return failure(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const ids = Array.isArray(body.organizations)
    ? body.organizations.filter((value): value is string => typeof value === "string")
    : [];
  const criteria = Array.isArray(body.criteria)
    ? body.criteria.filter((value): value is string => typeof value === "string")
    : [];

  const errors = new FieldErrors();
  if (ids.length < 2) {
    errors.add("organizations", "Select at least two organizations to compare.");
  }
  if (criteria.length === 0) {
    errors.add("criteria", "Select at least one comparison criterion.");
  }
  if (!errors.isEmpty) return errors.toResponse();

  const organizations = ids
    .map((id) => findOrganization(id))
    .filter((organization) => organization !== undefined)
    .map((organization) => {
      const reviews = listReviews(organization.id);

      return {
        ...withRating(organization),
        services: listServices(organization.id),
        review_count: reviewCountFor(organization.id),
        // docs/09:380 makes the AI sentiment index a comparison criterion. It is
        // scored from the same reviews as the AI summary, and stays null when
        // there are none: an organization with no reviews has no sentiment, not
        // a neutral one, and 0.5 would read as "middling".
        sentiment_score: reviews.length > 0 ? analyzeSentiment(reviews).positive / 100 : null,
      };
    });

  if (organizations.length !== ids.length) {
    return failure(404, "NOT_FOUND", "One or more organizations could not be found.");
  }

  return ok({
    organizations,
    criteria: criteria.map((criterion) => str(criterion) ?? criterion),
  });
}
