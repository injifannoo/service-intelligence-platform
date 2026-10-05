import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  failure,
  ok,
  requireUser,
} from "@/lib/dev-backend/http";
import { deleteService, findService, recordAudit } from "@/lib/dev-backend/store";

/** GET /api/v1/services/{id}/ — docs/05_API_Design.md:394-401. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const { id } = await params;
  const service = findService(id);
  if (!service) {
    return failure(404, "NOT_FOUND", "Service not found.");
  }

  return ok(service);
}

/**
 * DELETE /api/v1/services/{id}/.
 *
 * Not in docs/05_API_Design.md, but docs/05:239-245 lists DELETE as a standard
 * method and a service catalogue is not editable without removal. Owner-scoped
 * per docs/04:622-624.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  // Admission is by ownership rather than by the ORGANIZATION_OWNER role, since
  // a user who registered an organization while still a CUSTOMER owns it.
  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const service = findService(id);
  if (!service) {
    return failure(404, "NOT_FOUND", "Service not found.");
  }

  const isAdmin = auth.user.role === "ADMIN" || auth.user.role === "SUPER_ADMIN";
  if (!isAdmin && auth.user.organization_id !== service.organization_id) {
    return failure(403, "PERMISSION_DENIED", "You do not manage this organization.");
  }

  deleteService(id);
  recordAudit({ user_id: auth.user.id, action: "service.deleted", resource_id: id });

  return ok({ message: "Service deleted" });
}
