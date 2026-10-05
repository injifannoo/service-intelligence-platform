import type { NextRequest } from "next/server";

import { devBackendUnavailable, failure, ok } from "@/lib/dev-backend/http";
import { findUserByEmail, issueTokens } from "@/lib/dev-backend/store";

/**
 * POST /api/v1/auth/login/ — docs/05_API_Design.md:167-184.
 *
 * This is the one endpoint documented as returning a bare, un-enveloped token
 * payload, so the handler matches that exactly rather than wrapping it.
 */
export async function POST(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return failure(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return failure(400, "VALIDATION_ERROR", "Email and password are required.");
  }

  const user = findUserByEmail(email);

  // Same message for unknown email and wrong password so the endpoint cannot be
  // used to enumerate registered addresses.
  if (!user || user.password !== password) {
    return failure(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  if (!user.status) {
    return failure(403, "ACCOUNT_INACTIVE", "This account has been deactivated.");
  }

  return ok(issueTokens(user));
}
