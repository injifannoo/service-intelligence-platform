import type { NextRequest } from "next/server";

import {
  created,
  devBackendUnavailable,
  FieldErrors,
  failure,
  readJson,
  requireUser,
  str,
} from "@/lib/dev-backend/http";
import { findReview, isReviewReported, recordAudit, reportReview } from "@/lib/dev-backend/store";

/**
 * POST /api/v1/reviews/{id}/report/ — docs/05_API_Design.md:436-441.
 *
 * The docs define the endpoint but no request body or reason vocabulary, so
 * `reason` is accepted as a free string and echoed in the audit log for admin
 * moderation (docs/03:361 puts moderation on this domain).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!findReview(id)) {
    return failure(404, "NOT_FOUND", "Review not found.");
  }

  const body = await readJson(request);
  const reason = str(body?.reason)?.trim();
  const note = str(body?.note)?.trim();

  const errors = new FieldErrors();
  if (!reason) errors.add("reason", "This field is required.");
  if (!errors.isEmpty) return errors.toResponse();

  if (isReviewReported(id)) {
    return failure(409, "ALREADY_REPORTED", "You have already reported this review.");
  }

  reportReview(id, reason as string, note);

  recordAudit({
    user_id: auth.user.id,
    action: "review.reported",
    resource_id: id,
  });

  return created({ message: "Review reported" });
}
