import type { NextRequest } from "next/server";

import { devBackendUnavailable, failure, ok } from "@/lib/dev-backend/http";
import { findOrganization, listReviews } from "@/lib/dev-backend/store";

/**
 * GET /api/v1/organizations/{id}/reviews/ — docs/05_API_Design.md:426-432.
 *
 * Public. docs/04:349 confirms reviews attach to the organization, not to a
 * service, so a service detail view must fall back to this endpoint.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const { id } = await params;
  const organization = findOrganization(id);
  if (!organization) {
    return failure(404, "NOT_FOUND", "Organization not found.");
  }

  return ok(
    listReviews(id).map((review) => ({
      ...review,
      organization_name: organization.name,
    })),
  );
}
