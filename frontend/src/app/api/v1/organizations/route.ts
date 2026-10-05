import type { NextRequest } from "next/server";

import {
  created,
  devBackendUnavailable,
  FieldErrors,
  failure,
  num,
  paginate,
  readJson,
  readPageParams,
  requireUser,
  str,
} from "@/lib/dev-backend/http";
import {
  createOrganization,
  findIndustryByName,
  listOrganizations,
  listServices,
  recordAudit,
  withRating,
} from "@/lib/dev-backend/store";

/**
 * GET /api/v1/organizations/ — docs/05_API_Design.md:294-312.
 *
 * Supports every documented filter (`industry`, `location`, `rating`, `price`)
 * plus `search`, which docs/05:459 uses on the search endpoint and which this
 * endpoint shares so one list component can serve both.
 */
export async function GET(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const params = request.nextUrl.searchParams;
  const page = readPageParams(params);

  const search = params.get("search")?.trim().toLowerCase();
  const industry = params.get("industry")?.trim().toLowerCase();
  const location = params.get("location")?.trim().toLowerCase();
  const minRating = num(params.get("rating"));
  const maxPrice = num(params.get("price"));

  let results = listOrganizations().map(withRating);

  if (search) {
    results = results.filter(
      (organization) =>
        organization.name.toLowerCase().includes(search) ||
        (organization.description?.toLowerCase().includes(search) ?? false) ||
        listServices(organization.id).some((service) =>
          service.name.toLowerCase().includes(search),
        ),
    );
  }

  if (industry) {
    const match = findIndustryByName(industry);
    results = results.filter((organization) => organization.industry_id === match?.id);
  }

  if (location) {
    results = results.filter((organization) =>
      (organization.location?.toLowerCase().includes(location) ?? false),
    );
  }

  if (minRating !== undefined && minRating > 0) {
    results = results.filter(
      (organization) => (organization.rating ?? 0) >= minRating,
    );
  }

  if (maxPrice !== undefined && maxPrice > 0) {
    // An organization matches if any of its services is priced at or below the
    // ceiling, since services carry the only price in the schema (docs/04:332).
    results = results.filter((organization) =>
      listServices(organization.id).some(
        (service) => service.price !== null && service.price <= maxPrice,
      ),
    );
  }

  return paginate(results, page, {
    search: params.get("search") ?? undefined,
    industry: params.get("industry") ?? undefined,
    location: params.get("location") ?? undefined,
    rating: params.get("rating") ?? undefined,
    price: params.get("price") ?? undefined,
  });
}

/**
 * POST /api/v1/organizations/ — docs/05_API_Design.md:274-290.
 *
 * Takes `industry` as a name, per the documented request body, and resolves it
 * to the `industry_id` the schema actually stores.
 *
 * Requires authentication, and the caller becomes the organization owner.
 * docs/04 declares no owner column on Organization, so the link lives on the
 * user profile — see contradiction 5 in src/types/index.ts. docs/04:622-624
 * makes this FK the tenant-isolation boundary, so an unauthenticated create
 * would leave a tenant with no possible owner.
 */
export async function POST(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) {
    return failure(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const name = str(body.name)?.trim();
  const industryName = str(body.industry)?.trim();
  const description = str(body.description)?.trim();
  const location = str(body.location)?.trim();
  const phone = str(body.phone)?.trim();
  const website = str(body.website)?.trim();

  const errors = new FieldErrors();
  if (!name) errors.add("name", "This field is required.");
  if (!industryName) errors.add("industry", "This field is required.");
  if (auth.user.organization_id) {
    errors.add(
      "organization",
      "You already manage an organization. One verified organization is allowed per legal business.",
    );
  }

  const industry = industryName ? findIndustryByName(industryName) : undefined;
  if (industryName && !industry) {
    errors.add("industry", "Select a valid industry.");
  }
  if (!errors.isEmpty) return errors.toResponse();

  const organization = createOrganization({
    name: name as string,
    industry_id: industry?.id ?? null,
    description,
    location,
    phone,
    website,
    ownerId: auth.user.id,
  });

  recordAudit({
    user_id: auth.user.id,
    action: "organization.created",
    resource_id: organization.id,
  });

  return created(withRating(organization));
}
