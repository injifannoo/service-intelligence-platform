import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  failure,
  ok,
  requireUser,
} from "@/lib/dev-backend/http";
import {
  findOrganization,
  listOrganizations,
  listReviews,
  withRating,
} from "@/lib/dev-backend/store";
import { buildDashboard } from "@/lib/dev-backend/ai";

/**
 * GET /api/v1/organizations/{id}/analytics/dashboard/
 * — docs/05_API_Design.md:591-613.
 *
 * MVP Version 2 (docs/08_Development_Roadmap.md:416-426).
 *
 * Owner-scoped, unlike the other MVP Version 2 endpoints: this exposes a
 * competitor ranking, so docs/02:235 requires that only the owning organization
 * and admins can read it. Ownership is `UserProfile.organization_id`, independent
 * of role.
 *
 * `params` is typed explicitly rather than via the generated `RouteContext`
 * global, so `tsc --noEmit` passes on a fresh clone before any Next command has
 * generated types.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const organization = findOrganization(id);
  if (!organization) {
    return failure(404, "NOT_FOUND", "Organization not found.");
  }

  const isOwner = auth.user.organization_id === id;
  const isAdmin = auth.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return failure(403, "PERMISSION_DENIED", "Only the organization owner can view this dashboard.");
  }

  // Peers are same-industry organizations, so `competitor_position` ranks against
  // a comparable set rather than the entire platform. Rejected organizations are
  // excluded: ranking a delisted business would misrepresent the field.
  const peers = listOrganizations()
    .filter(
      (entry) =>
        entry.industry_id === organization.industry_id &&
        entry.verification_status !== "REJECTED",
    )
    .map((peer) => withRating(peer));

  return ok(
    buildDashboard({
      organization,
      reviews: listReviews(id),
      peers,
    }),
  );
}