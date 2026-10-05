import { apiClient, apiPaginated } from "@/lib/api-client";
import type {
  Organization,
  OrganizationDetail,
  OrganizationFilters,
  OrganizationInput,
  Pagination,
} from "@/types";

/**
 * Transport for the organizations slice, docs/05_API_Design.md:272-361.
 *
 * `apiClient` / `apiPaginated` unwrap the `{ success, data, pagination }`
 * envelope, so this module is the only place in the slice that knows the
 * envelope exists.
 */
export const organizationsApi = {
  async list(
    filters: OrganizationFilters = {},
  ): Promise<{ data: Organization[]; pagination: Pagination | null }> {
    return apiPaginated<Organization>("/organizations/", {
      query: {
        industry: filters.industry,
        location: filters.location,
        rating: filters.rating,
        price: filters.price,
        search: filters.search,
        page: filters.page,
        page_size: filters.page_size,
      },
    });
  },

  detail(id: string): Promise<OrganizationDetail> {
    return apiClient.get<OrganizationDetail>(`/organizations/${id}/`);
  },

  create(payload: OrganizationInput): Promise<Organization> {
    return apiClient.post<Organization>("/organizations/", payload);
  },

  update(id: string, payload: OrganizationInput): Promise<Organization> {
    return apiClient.put<Organization>(`/organizations/${id}/`, payload);
  },
};
