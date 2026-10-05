import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  paginate,
  readPageParams,
  requireRole,
} from "@/lib/dev-backend/http";
import { findOrganization, listVerifications } from "@/lib/dev-backend/store";

/**
 * GET /api/v1/admin/verifications/
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION. docs/08:408 lists "Admin Panel &
 * Basic Audit Logs" as an MVP Version 1 requirement and docs/04:379-393 defines
 * a Verification table, but docs/05_API_Design.md documents no admin endpoint
 * at all. The path and shape follow the naming of the rest of the API; confirm
 * before the Django slice lands.
 */
export async function GET(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const page = readPageParams(params);

  const claims = listVerifications().map((claim) => {
    const organization = findOrganization(claim.organization_id);
    return { ...claim, organization_name: organization?.name ?? null };
  });

  return paginate(claims, page);
}
