import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  FieldErrors,
  failure,
  ok,
  readJson,
  requireUser,
  str,
} from "@/lib/dev-backend/http";
import { findUserByEmail, updateUser } from "@/lib/dev-backend/store";

/**
 * Builds the profile response.
 *
 * `organization_id` is added here and is NOT a `users` column in docs/04 — see
 * contradiction 5 in src/types/index.ts. docs/04:274-292 gives Organization no
 * owner reference, so the backend has to supply this association somewhere.
 */
function toProfile(user: NonNullable<ReturnType<typeof updateUser>>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    organization_id: user.organization_id,
  };
}

/** GET /api/v1/users/profile/ — docs/05_API_Design.md:250-258. */
export async function GET(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  return ok(toProfile(auth.user));
}

/** PUT /api/v1/users/profile/ — docs/05_API_Design.md:260-268. */
export async function PUT(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) {
    return failure(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const name = str(body.name)?.trim();
  const email = str(body.email)?.trim();

  const errors = new FieldErrors();
  if (!name) {
    errors.add("name", "This field is required.");
  }
  if (!email) {
    errors.add("email", "This field is required.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.add("email", "Enter a valid email address.");
  } else {
    const existing = findUserByEmail(email);
    if (existing && existing.id !== auth.user.id) {
      errors.add("email", "A user with this email already exists.");
    }
  }
  if (!errors.isEmpty) return errors.toResponse();

  const user = updateUser(auth.user.id, { name, email });
  if (!user) {
    return failure(404, "NOT_FOUND", "User not found.");
  }

  return ok(toProfile(user));
}
