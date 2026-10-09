import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  failure,
  ok,
  readJson,
  requireUser,
} from "@/lib/dev-backend/http";
import { findOrganization, listReviews } from "@/lib/dev-backend/store";
import { analyzeSentiment } from "@/lib/dev-backend/ai";

/**
 * POST /api/v1/ai/sentiment/ — docs/05_API_Design.md:552-558.
 *
 * MVP Version 2 (docs/08_Development_Roadmap.md:416-426). Responds with exactly
 * `{ positive, negative }` as the docs specify.
 *
 * docs/05 documents the response but not the request body, so two shapes are
 * accepted:
 *   - `{ organization_id }` — aggregate every review on file (dashboard use)
 *   - `{ text }`            — score a single arbitrary string
 * `organization_id` takes precedence. Confirm the body with the backend before
 * switching the real implementation in.
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

  const organizationId =
    typeof body.organization_id === "string" ? body.organization_id.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (organizationId) {
    if (!findOrganization(organizationId)) {
      return failure(404, "NOT_FOUND", "Organization not found.");
    }

    const reviews = listReviews(organizationId);
    if (reviews.length === 0) {
      // Distinct from a 50/50 split, which is what a real "balanced" result looks
      // like: there is genuinely nothing to analyse yet.
      return failure(404, "NO_REVIEWS", "This organization has no reviews to analyse.");
    }

    return ok(analyzeSentiment(reviews));
  }

  if (!text) {
    return failure(422, "MISSING_INPUT", "Provide either `organization_id` or `text`.");
  }

  return ok(analyzeSentiment([text]));
}