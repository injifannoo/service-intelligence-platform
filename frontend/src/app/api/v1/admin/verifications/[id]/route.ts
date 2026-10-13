import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  failure,
  ok,
  readJson,
  requireRole,
  str,
} from "@/lib/dev-backend/http";
import { decideVerification, recordAudit } from "@/lib/dev-backend/store";

/**
 * POST /api/v1/admin/verifications/{id}/
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION — see the GET handler in this
 * directory. Approving or rejecting also updates `Organization.verification_status`
 * so the public profile reflects the decision, which is the whole point of
 * docs/02:96-98 ("Moderates platform and verifies organizations").
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await readJson(request);
  const action = str(body?.action)?.trim().toUpperCase();

  if (action !== "APPROVE" && action !== "REJECT") {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
      action: ['Must be either "APPROVE" or "REJECT".'],
    });
  }

  const decision = action === "APPROVE" ? "VERIFIED" : "REJECTED";
  const claim = decideVerification(id, decision);
  if (!claim) {
    return failure(404, "NOT_FOUND", "Verification request not found.");
  }

  recordAudit({
    user_id: auth.user.id,
    action: `verification.${decision.toLowerCase()}`,
    resource_id: claim.id,
  });

  return ok(claim);
}
