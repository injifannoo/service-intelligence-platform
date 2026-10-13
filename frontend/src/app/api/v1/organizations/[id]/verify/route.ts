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
import {
  createVerificationClaim,
  findOrganization,
  findVerificationByOrganization,
  recordAudit,
} from "@/lib/dev-backend/store";

/**
 * POST /api/v1/organizations/{id}/verify/ — docs/05_API_Design.md:344-356.
 *
 * Submits a verification claim for admin review. docs/04:379-393 makes
 * Verification 1:1 with Organization, so a second claim replaces the first.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  // Any signed-in user is admitted; the ownership check below is the real gate,
  // because a freshly registered user still carries the CUSTOMER role.
  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!findOrganization(id)) {
    return failure(404, "NOT_FOUND", "Organization not found.");
  }

  const isAdmin = auth.user.role === "ADMIN" || auth.user.role === "SUPER_ADMIN";
  if (!isAdmin && auth.user.organization_id !== id) {
    return failure(403, "PERMISSION_DENIED", "You do not manage this organization.");
  }

  const body = await readJson(request);
  if (!body) {
    return failure(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const documentType = str(body.document_type)?.trim();
  const documentUrl = str(body.document_url)?.trim();

  const errors = new FieldErrors();
  if (!documentType) errors.add("document_type", "This field is required.");
  if (!documentUrl) {
    errors.add("document_url", "This field is required.");
  } else if (!/^https?:\/\/\S+$/i.test(documentUrl)) {
    errors.add("document_url", "Enter a valid http(s) URL.");
  }
  if (!errors.isEmpty) return errors.toResponse();

  const existing = findVerificationByOrganization(id);
  if (existing?.status === "VERIFIED") {
    return failure(409, "ALREADY_VERIFIED", "This organization is already verified.");
  }

  const claim = createVerificationClaim({
    organization_id: id,
    document_type: documentType as string,
    document_url: documentUrl as string,
  });

  recordAudit({
    user_id: auth.user.id,
    action: "verification.submitted",
    resource_id: claim.id,
  });

  return created(claim);
}
