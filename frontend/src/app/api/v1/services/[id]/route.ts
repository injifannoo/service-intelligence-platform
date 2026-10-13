import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  failure,
  FieldErrors,
  ok,
  readJson,
  requireUser,
  str,
  num,
} from "@/lib/dev-backend/http";
import {
  deleteService,
  findService,
  recordAudit,
  updateService,
} from "@/lib/dev-backend/store";

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
 * PUT /api/v1/services/{id}/.
 *
 * Sprint 4 (docs/09_Sprint_Plan.md:291-308) requires "Add service, Edit
 * service, View services", so the catalogue is not complete without an update
 * verb. PUT is used rather than PATCH to match docs/05:239-245, but any key the
 * body omits is left untouched, which makes partial updates safe.
 *
 * Owner-scoped on the same rule as DELETE.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

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

  const body = await readJson(request);
  if (!body) {
    return failure(400, "INVALID_PAYLOAD", "A JSON body is required.");
  }

  const errors = new FieldErrors();
  const name = str(body.name);
  const description = body.description === null ? null : str(body.description);
  const price = body.price === null ? null : num(body.price);
  const status = typeof body.status === "boolean" ? body.status : undefined;

  if (name !== undefined && name.trim() === "") {
    errors.add("name", "Service name cannot be empty.");
  }
  if (body.price !== undefined && body.price !== null && price === undefined) {
    errors.add("price", "Enter a number.");
  }
  if (price !== undefined && price !== null && price < 0) {
    errors.add("price", "Price cannot be negative.");
  }
  if (!errors.isEmpty) {
    return errors.toResponse();
  }

  const updated = updateService(id, { name, description, price, status });
  if (!updated) {
    return failure(404, "NOT_FOUND", "Service not found.");
  }

  recordAudit({ user_id: auth.user.id, action: "service.updated", resource_id: id });

  return ok(updated);
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
