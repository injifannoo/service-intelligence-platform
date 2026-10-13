import type { NextRequest } from "next/server";

import {
  created,
  devBackendUnavailable,
  failure,
  paginate,
  readPageParams,
} from "@/lib/dev-backend/http";
import { createService, findOrganization, listServices, withRating } from "@/lib/dev-backend/store";

/**
 * GET /api/v1/services/ — docs/05_API_Design.md:384-391.
 *
 * The docs specify no filters for this endpoint, but an organization_id query
 * parameter is accepted so the service browser can filter without a second
 * route. Each row is decorated with its parent organization's name and rating
 * so a flat service list is still readable.
 */
export async function GET(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const params = request.nextUrl.searchParams;
  const page = readPageParams(params);
  const organizationId = params.get("organization_id") ?? undefined;

  const services = listServices(organizationId).map((service) => {
    const organization = findOrganization(service.organization_id);
    return {
      ...service,
      organization_name: organization?.name ?? null,
      organization_rating: organization ? withRating(organization).rating : null,
    };
  });

  return paginate(services, page, { organization_id: organizationId });
}

/**
 * POST /api/v1/services/ — docs/05_API_Design.md:365-381.
 *
 * Takes `organization_id` because the documented body has no such field while
 * the schema requires one (docs/04:320).
 */
export async function POST(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return failure(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const organizationId = typeof body.organization_id === "string" ? body.organization_id : "";

  if (!name) {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
      name: ["This field is required."],
    });
  }
  if (!organizationId || !findOrganization(organizationId)) {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
      organization_id: ["A valid organization_id is required."],
    });
  }

  const description = typeof body.description === "string" ? body.description : undefined;
  const price = typeof body.price === "number" ? body.price : undefined;

  return created(
    createService({ organization_id: organizationId, name, description, price }),
  );
}
