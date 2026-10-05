import type { NextRequest } from "next/server";

import {
  created,
  devBackendUnavailable,
  FieldErrors,
  failure,
  num,
  ok,
  readJson,
  requireUser,
  str,
} from "@/lib/dev-backend/http";
import { createService, findOrganization, listServices, recordAudit } from "@/lib/dev-backend/store";

/**
 * GET /api/v1/organizations/{id}/services/ — docs/05_API_Design.md:358-361.
 * Public: an organization profile is readable while deciding whether to engage.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const { id } = await params;
  if (!findOrganization(id)) {
    return failure(404, "NOT_FOUND", "Organization not found.");
  }

  return ok(listServices(id));
}

/**
 * POST /api/v1/organizations/{id}/services/ — docs/05_API_Design.md:358-361.
 *
 * Guarded to the owning organization. docs/03:214-215 places permission
 * enforcement in the backend; this mirrors it so the frontend can be exercised
 * against the same 403.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  // Any signed-in user is admitted here; the ownership check below is the real
  // gate. A newly registered user still has the CUSTOMER role, so requiring
  // ORGANIZATION_OWNER would lock them out of the organization they just
  // registered and can never let them list anything.
  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!findOrganization(id)) {
    return failure(404, "NOT_FOUND", "Organization not found.");
  }

  // docs/04:622-624 mandates foreign-key tenant isolation: a user may only
  // write to the organization they manage, not merely any organization id.
  if (auth.user.role !== "ADMIN" && auth.user.role !== "SUPER_ADMIN") {
    if (auth.user.organization_id !== id) {
      return failure(403, "PERMISSION_DENIED", "You do not manage this organization.");
    }
  }

  const body = await readJson(request);
  if (!body) {
    return failure(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const name = str(body.name)?.trim();
  const price = num(body.price);
  const description = str(body.description)?.trim();

  const errors = new FieldErrors();
  if (!name) errors.add("name", "This field is required.");
  if (price !== undefined && price < 0) {
    errors.add("price", "Must be a positive number.");
  }
  if (!errors.isEmpty) return errors.toResponse();

  const service = createService({
    organization_id: id,
    name: name as string,
    description,
    price,
  });

  recordAudit({
    user_id: auth.user.id,
    action: "service.created",
    resource_id: service.id,
  });

  return created(service);
}
