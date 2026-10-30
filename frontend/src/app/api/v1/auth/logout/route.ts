import type { NextRequest } from "next/server";

import { devBackendUnavailable, ok, requireUser } from "@/lib/dev-backend/http";
import { revokeSubject } from "@/lib/dev-backend/store";

/**
 * POST /api/v1/auth/logout/ - docs/05_API_Design.md:186-194.
 *
 * The subject is added to the dev denylist so the access token stops working
 * immediately rather than lingering until its expiry. A real deployment rotates
 * or denylists the refresh token instead (docs/11_Deployment.md:460).
 */
export async function POST(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  revokeSubject(auth.user.id);

  return ok({ message: "Logged out" });
}
