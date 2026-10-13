import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  FieldErrors,
  failure,
  ok,
  readJson,
  str,
} from "@/lib/dev-backend/http";
import {
  findOrganization,
  listIndustries,
  listServices,
  reviewCountFor,
  updateOrganization,
  withRating,
} from "@/lib/dev-backend/store";

/**
 * GET /api/v1/organizations/{id}/ — docs/05_API_Design.md:316-333.
 *
 * The documented response nests the service catalogue alongside the
 * organization, so the detail page needs one round trip rather than two.
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

  const industry =
    listIndustries().find((entry) => entry.id === organization.industry_id) ?? null;

  return ok({
    ...withRating(organization),
    services: listServices(organization.id),
    industry,
    review_count: reviewCountFor(organization.id),
  });
}

/** PUT /api/v1/organizations/{id}/ — docs/05_API_Design.md:336-341. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const { id } = await params;
  if (!findOrganization(id)) {
    return failure(404, "NOT_FOUND", "Organization not found.");
  }

  const body = await readJson(request);
  if (!body) {
    return failure(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const name = str(body.name)?.trim();
  const errors = new FieldErrors();
  if (!name) errors.add("name", "This field is required.");
  if (!errors.isEmpty) return errors.toResponse();

  const description = str(body.description)?.trim();
  const location = str(body.location)?.trim();
  const phone = str(body.phone)?.trim();
  const website = str(body.website)?.trim();

  const organization = updateOrganization(id, {
    name: name as string,
    description: description ?? null,
    location: location ?? null,
    phone: phone ?? null,
    website: website ?? null,
  });

  return ok(organization ? withRating(organization) : null);
}
