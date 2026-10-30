import { apiPaginated } from "@/lib/api-client";
import type { Organization, Pagination } from "@/types";

/** Filters accepted by `GET /api/v1/search/`, docs/05_API_Design.md:446-459. */
export interface SearchFilters {
  query?: string;
  industry?: string;
  location?: string;
  rating?: number;
  /** Upper budget bound applied to the cheapest listed service. Contradiction 8: no currency. */
  price?: number;
  page?: number;
}

/**
 * Transport for the search slice.
 *
 * docs/05 defines the `query` parameter but not the response body, so the route
 * returns the standard paginated list envelope. `apiPaginated` unwraps it here
 * and nowhere else in the slice.
 *
 * There is deliberately no `searchAi` call: `POST /api/v1/search/ai/`
 * (docs/05_API_Design.md:464-491) is MVP Version 2 per
 * docs/08_Development_Roadmap.md:416-426, and no UI is built for it yet.
 */
export const searchApi = {
  async list(
    filters: SearchFilters,
  ): Promise<{ data: Organization[]; pagination: Pagination | null }> {
    return apiPaginated<Organization>("/search/", {
      query: {
        query: filters.query,
        industry: filters.industry,
        location: filters.location,
        rating: filters.rating,
        price: filters.price,
        page: filters.page,
        page_size: 20,
      },
    });
  },
};
