import type { NextRequest } from "next/server";

import { devBackendUnavailable, failure, created } from "@/lib/dev-backend/http";
import { createUser, findUserByEmail } from "@/lib/dev-backend/store";

/**
 * POST /api/v1/auth/register/ — docs/05_API_Design.md:139-163.
 *
 * Returns `{ message }` with no tokens, exactly as the documented contract
 * specifies, which is why the register form transitions to the email
 * verification step rather than signing the user straight in.
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const details: Record<string, unknown> = {};
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

  if (Object.keys(details).length > 0) {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", details);
  }

  if (findUserByEmail(email)) {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
      email: ["A user with this email already exists."],
    });
  }

  createUser({ name, email, password });

  return created({ message: "Account created" });
}
