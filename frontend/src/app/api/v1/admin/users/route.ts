import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  failure,
  ok,
  paginate,
  readPageParams,
  requireSuperAdmin,
  str,
} from "@/lib/dev-backend/http";
import {
  createAdminUser,
  findUserByEmail,
  isAssignableAdminRole,
  listUsers,
  recordAudit,
  toPublicUser,
} from "@/lib/dev-backend/store";
import type { UserRole } from "@/types";

/**
 * GET /api/v1/admin/users/ — list accounts.
 *
 * ASSUMPTION, NOT IN docs/05_API_Design.md. No admin endpoint is documented;
 * docs/08:408 asks for an "Admin Panel & Basic Audit Logs" and docs/02:140 lists
 * "Role management", so the shape here is a frontend-driven contract awaiting a
 * real backend.
 *
 * Readable by ADMIN and SUPER_ADMIN. Listing is moderation-visible; changing an
 * account is Super Admin only and lives in `[id]/route.ts`.
 */
export async function GET(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireSuperAdmin(request);
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const page = readPageParams(params);

  const roleFilter = params.get("role");
  if (roleFilter !== null && !["CUSTOMER", "ORGANIZATION_OWNER", "ADMIN", "SUPER_ADMIN"].includes(roleFilter)) {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
      role: ["Unknown role."],
    });
  }

  const statusParam = params.get("status");
  if (statusParam !== null && !["true", "false"].includes(statusParam)) {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
      status: ["Must be true or false."],
    });
  }

  const users = listUsers({
    query: str(params.get("query")) ?? undefined,
    role: (roleFilter as UserRole | null) ?? undefined,
    status: statusParam === null ? undefined : statusParam === "true",
  });

  return paginate(users.map(toPublicUser), page, {
    query: params.get("query") ?? undefined,
    role: params.get("role") ?? undefined,
    status: params.get("status") ?? undefined,
  });
}

/**
 * POST /api/v1/admin/users/ — provision an admin-tier account.
 *
 * SUPER_ADMIN ONLY. This is the "admins are created in the background" path: the
 * public register endpoint can never produce an admin role, so an admin account
 * exists only because it was seeded or because a Super Admin created it here.
 *
 * Assumed contract, see the note on GET above.
 */
export async function POST(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireSuperAdmin(request);
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return failure(400, "INVALID_JSON", "Request body must be valid JSON.");

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role;

  const details: Record<string, string[]> = {};
  if (!name) details.name = ["This field is required."];
  if (!email) {
    details.email = ["This field is required."];
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    details.email = ["Enter a valid email address."];
  }
  if (!password) {
    details.password = ["This field is required."];
  } else if (password.length < 8) {
    details.password = ["Must be at least 8 characters."];
  }
  // Rejecting rather than defaulting matters: silently coercing an unrecognised
  // role would let a caller believe they created an Admin when they did not.
  if (!isAssignableAdminRole(role)) {
    details.role = ["Choose ADMIN or SUPER_ADMIN."];
  }

  if (Object.keys(details).length > 0) {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", details);
  }

  // Repeated guard, purely to narrow `role` for the create call. The check above
  // is what surfaces the error to the client; this one cannot fail unless that
  // block is deleted.
  if (!isAssignableAdminRole(role)) {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
      role: ["Choose ADMIN or SUPER_ADMIN."],
    });
  }

  if (findUserByEmail(email)) {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
      email: ["A user with this email already exists."],
    });
  }

  const created = createAdminUser({ name, email, password, role });
  recordAudit({
    user_id: auth.user.id,
    action: `admin.user.created.${created.role.toLowerCase()}`,
    resource_id: created.id,
  });

  return ok(toPublicUser(created), 201);
}
