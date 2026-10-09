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
 * implemented separately in `app/api/v1/search/ai/route.ts` for MVP Version 2
 * (docs/08:416-426). This route stays keyword-based.
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
  const maxPrice = num(params.get("price"));

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

  // Sprint 5 (docs/09_Sprint_Plan.md:322-325) requires "dynamic rating and price
  // filters". `price` is an organisation's cheapest listed service: docs/04
  // scopes the price to `Service`, not `Organization`, so an organization-level
  // budget has to be resolved through the catalogue.
  //
  // Only active services count. A paused or inactive listing is not bookable, so
  // letting its price satisfy a budget would advertise a provider the visitor
  // cannot actually book within budget.
  if (maxPrice !== undefined) {
    results = results.filter((organization) => {
      const prices = listServices(organization.id)
        .filter((service) => service.status)
        .map((service) => service.price)
        .filter((value): value is number => value !== null);
      return prices.length > 0 && Math.min(...prices) <= maxPrice;
    });
  }

  return paginate(results, page, {
    query: params.get("query") ?? undefined,
    industry: params.get("industry") ?? undefined,
    location: params.get("location") ?? undefined,
    rating: params.get("rating") ?? undefined,
    price: params.get("price") ?? undefined,
  });
}
