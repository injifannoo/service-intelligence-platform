import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  failure,
  guardSelfTarget,
  ok,
  readJson,
  requireSuperAdmin,
} from "@/lib/dev-backend/http";
import {
  findUserById,
  isAssignableAdminRole,
  recordAudit,
  toPublicUser,
} from "@/lib/dev-backend/store";
import type { AssignableAdminRole } from "@/types";

/**
 * PATCH /api/v1/admin/users/{id}/ — change an account's role or status.
 *
 * Assumed contract; no admin endpoint is documented in docs/05_API_Design.md.
 *
 * Deliberately a PATCH rather than a PUT: activation, role change, and name
 * edits are independent concerns and a full replace would let a status-only
 * request silently blank the role.
 *
 * Authorization: SUPER_ADMIN only. Account management is the Super Admin's
 *  responsibility, so a regular Admin is refused here even for an activation
 *  change — an Admin manages content, not accounts. `guardSelfTarget` then stops
 *  a Super Admin from demoting or deactivating themselves, which would leave no
 *  account able to manage accounts.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireSuperAdmin(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const target = findUserById(id);
  if (!target) return failure(404, "NOT_FOUND", "User not found.");

  const body = await readJson(request);
  if (!body) return failure(400, "INVALID_JSON", "Request body must be valid JSON.");

  const patch: { role?: AssignableAdminRole; status?: boolean; name?: string } = {};
  const details: Record<string, string[]> = {};

  if (body.role !== undefined) {
    if (!isAssignableAdminRole(body.role)) {
      details.role = ["Only ADMIN and SUPER_ADMIN can be assigned from the admin area."];
    } else {
      patch.role = body.role;
    }
  }

  if (body.status !== undefined) {
    if (typeof body.status !== "boolean") {
      details.status = ["Must be true or false."];
    } else {
      patch.status = body.status;
    }
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      details.name = ["This field is required."];
    } else {
      patch.name = body.name.trim();
    }
  }

  if (Object.keys(details).length > 0) {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", details);
  }

  if (Object.keys(patch).length === 0) {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
      status: ["Supply at least one of role, status, or name."],
    });
  }

  const denied = guardSelfTarget(auth.user, target);
  if (denied) return denied;

  if (patch.role !== undefined) {
    target.role = patch.role;
  }
  if (patch.name !== undefined) {
    target.name = patch.name;
  }
  if (patch.status !== undefined) {
    target.status = patch.status;
  }

  if (patch.role !== undefined) {
    recordAudit({
      user_id: auth.user.id,
      action: `admin.user.role_changed.${target.role.toLowerCase()}`,
      resource_id: target.id,
    });
  }
  if (patch.status !== undefined) {
    recordAudit({
      user_id: auth.user.id,
      action: patch.status ? "admin.user.activated" : "admin.user.deactivated",
      resource_id: target.id,
    });
  }

  return ok(toPublicUser(target));
}
