import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  failure,
  ok,
  readJson,
  requireRole,
  str,
} from "@/lib/dev-backend/http";
import {
  dismissReviewReport,
  isReviewReported,
  recordAudit,
  removeReview,
} from "@/lib/dev-backend/store";

/**
 * POST /api/v1/admin/reports/{id}/ — moderate a reported review.
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION — see the GET handler in this
 * directory. The two outcomes are the ones docs/02 implies by asserting that
 * reviews are moderated (02:314) and that fraudulent reviews are removed
 * (02:315):
 *
 *   DISMISS — the report is not actionable; the review stays published and only
 *             the report is cleared, so moderation is reversible until the
 *             review itself is deleted.
 *   REMOVE  — the review is deleted from the platform.
 *
 * `{id}` is the review id, which is also the report's key (see
 * `ModerationEntry` in `lib/dev-backend/store.ts`).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireRole(request, ["MODERATOR", "ADMIN", "SUPER_ADMIN"]);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await readJson(request);
  const action = str(body?.action)?.trim().toUpperCase();

  if (action !== "DISMISS" && action !== "REMOVE") {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
      action: ['Must be either "DISMISS" or "REMOVE".'],
    });
  }

  if (!isReviewReported(id)) {
    return failure(404, "NOT_FOUND", "This review is not awaiting moderation.");
  }

  if (action === "DISMISS") {
    const report = dismissReviewReport(id);
    if (!report) {
      return failure(404, "NOT_FOUND", "This review is not awaiting moderation.");
    }
    recordAudit({
      user_id: auth.user.id,
      action: "review.report.dismissed",
      resource_id: id,
    });
    return ok({ action, review_id: id });
  }

  const review = removeReview(id);
  if (!review) {
    return failure(404, "NOT_FOUND", "Review not found.");
  }

  recordAudit({
    user_id: auth.user.id,
    action: "review.removed",
    resource_id: id,
  });

  return ok({ action, review_id: id });
}
