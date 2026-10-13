import type { NextRequest } from "next/server";

import { AUTH_COOKIES } from "@/config/site-config";
import { devBackendUnavailable, failure, ok } from "@/lib/dev-backend/http";
import { findUserById, issueTokens, readTokenSubject } from "@/lib/dev-backend/store";

/**
 * POST /api/v1/auth/refresh/
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION: docs/05_API_Design.md documents the
 * refresh token in the login response (line 180) and docs/11_Deployment.md:460
 * requires rotating refresh tokens, but neither document specifies this
 * endpoint. `POST /auth/refresh/` is the conventional path and mirrors the rest
 * of the auth routes; confirm the path and payload when the Django slice lands.
 *
 * The token is accepted from the request body or from a cookie, so switching to
 * the HTTP-only cookie scheme in docs/11_Deployment.md:460 needs no client
 * change.
 */
export async function POST(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  let fromBody: string | null = null;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.refresh_token === "string") fromBody = body.refresh_token;
  } catch {
    // No body is fine; fall through to the cookie.
  }

  const token = fromBody ?? request.cookies.get(AUTH_COOKIES.refreshToken)?.value ?? null;
  if (!token) {
    return failure(401, "NOT_AUTHENTICATED", "No refresh token was provided.");
  }

  const subject = readTokenSubject(token);
  if (!subject) {
    return failure(401, "INVALID_TOKEN", "Refresh token is invalid or expired.");
  }

  const user = findUserById(subject);
  if (!user) {
    return failure(401, "INVALID_TOKEN", "Refresh token is invalid or expired.");
  }

  if (!user.status) {
    return failure(403, "ACCOUNT_INACTIVE", "This account has been deactivated.");
  }

  // Real deployments would rotate here: persist the new refresh token and
  // invalidate the presented one so it cannot be replayed.
  return ok(issueTokens(user));
}
