import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  paginate,
  readPageParams,
  requireRole,
} from "@/lib/dev-backend/http";
import { listAuditLogs } from "@/lib/dev-backend/store";

/**
 * GET /api/v1/admin/audit-logs/
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION. docs/04:626-628 defines an
 * `audit_logs` table with `user_id`, `action`, `resource_id`, and `timestamp`,
 * and docs/08:408 requires an audit log view, but docs/05_API_Design.md
 * documents no endpoint for it. Path and envelope follow the rest of the API.
 *
 * Note docs/04:628 declares no primary key here, unlike every other table, so
 * `id` is typed optional.
 */
export async function GET(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireRole(request, ["ADMIN", "SUPER_ADMIN"]);
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const page = readPageParams(params);

  return paginate(listAuditLogs(), page);
}
