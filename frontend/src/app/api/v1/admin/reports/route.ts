import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  paginate,
  readPageParams,
  requireRole,
} from "@/lib/dev-backend/http";
import { listReportedReviews } from "@/lib/dev-backend/store";

/**
 * GET /api/v1/admin/reports/
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION. docs/05_API_Design.md documents no
 * admin endpoint at all, but docs/02:127 requires "manual abuse reporting
 * queues", docs/02:314 states "Reviews are moderated", and docs/09 Sprint 6:358
 * puts "moderation workflows" in the frontend deliverable. The report itself is
 * a documented endpoint (docs/05:436-441); listing and acting on those reports
 * is what the PRD describes but the API reference omits, so the path and shape
 * follow the naming of the rest of the admin surface.
 *
 * Restricted to the admin tiers, matching `/admin/verifications` — moderation is
 * a Platform Admin capability (docs/02:96-98), not a Super Admin one.
 */
export async function GET(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if ("response" in auth) return auth.response;

  const page = readPageParams(request.nextUrl.searchParams);

  return paginate(listReportedReviews(), page);
}
