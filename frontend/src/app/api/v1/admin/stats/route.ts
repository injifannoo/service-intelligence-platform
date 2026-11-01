import type { NextRequest } from "next/server";

import { devBackendUnavailable, ok, requireRole } from "@/lib/dev-backend/http";
import { platformStats } from "@/lib/dev-backend/store";

/**
 * GET /api/v1/admin/stats/ — counts for the admin overview.
 *
 * ASSUMPTION, NOT IN docs/05_API_Design.md. docs/01:520-546 lists the platform
 * success metrics (MAU, search success rate, recommendation acceptance rate,
 * sentiment accuracy) but no endpoint is specified, and there is no event
 * telemetry to compute most of them from — docs/01:548 requires Celery/Redis
 * domain events "from day one" and that never landed.
 *
 * These are therefore live counts over the current records, not the success
 * metrics from the vision document. Deliberately no fabricated time series.
 */
export async function GET(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireRole(request, ["MODERATOR", "ADMIN", "SUPER_ADMIN"]);
  if ("response" in auth) return auth.response;

  return ok(platformStats());
}
