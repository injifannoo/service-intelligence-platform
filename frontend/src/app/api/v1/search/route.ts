import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  num,
  paginate,
  readPageParams,
} from "@/lib/dev-backend/http";
import {
  findIndustryByName,
  listOrganizations,
  listServices,
  withRating,
} from "@/lib/dev-backend/store";

/**
 * GET /api/v1/search/?query=hotel — docs/05_API_Design.md:446-459.
 *
 * docs/05 specifies the endpoint and the `query` parameter but not the response
 * shape. It returns the standard paginated list envelope so the same list
 * component can render search results and the browse list unchanged.
 *
 * docs/05:464-491 also defines `POST /api/v1/search/ai/` for semantic search,
 * but docs/08:416-426 places semantic search in MVP Version 2, so no route or
 * UI is built for it yet.
 */
export async function GET(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const params = request.nextUrl.searchParams;
  const page = readPageParams(params);
  const query = params.get("query")?.trim().toLowerCase() ?? "";
  const industry = params.get("industry")?.trim() ?? "";
  const location = params.get("location")?.trim().toLowerCase() ?? "";
  const minRating = num(params.get("rating")) ?? 0;

  let results = listOrganizations().map(withRating);

  if (query) {
    results = results.filter(
      (organization) =>
        organization.name.toLowerCase().includes(query) ||
        (organization.description?.toLowerCase().includes(query) ?? false) ||
        listServices(organization.id).some(
          (service) =>
            service.name.toLowerCase().includes(query) ||
            (service.description?.toLowerCase().includes(query) ?? false),
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

  if (minRating > 0) {
    results = results.filter((organization) => (organization.rating ?? 0) >= minRating);
  }

  return paginate(results, page, {
    query: params.get("query") ?? undefined,
    industry: params.get("industry") ?? undefined,
    location: params.get("location") ?? undefined,
    rating: params.get("rating") ?? undefined,
  });
}
