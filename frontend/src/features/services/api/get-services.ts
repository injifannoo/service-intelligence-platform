import { apiClient, apiPaginated } from "@/lib/api-client";
import type { Pagination, Service, ServiceFilters, ServiceInput } from "@/types";

/** A service row decorated by the backend with its parent organization. */
export type ServiceWithOrganization = Service & {
  organization_name: string | null;
  organization_rating: number | null;
};

/**
 * Transport for the services slice, docs/05_API_Design.md:363-401.
 *
 * This module is the only place in the slice that knows the response envelope
 * exists; `apiClient` / `apiPaginated` unwrap it.
 */
export const servicesApi = {
  async list(
    filters: ServiceFilters = {},
  ): Promise<{ data: ServiceWithOrganization[]; pagination: Pagination | null }> {
    return apiPaginated<ServiceWithOrganization>("/services/", {
      query: {
        organization_id: filters.organization_id,
        category_id: filters.category_id,
        status: filters.status,
        search: filters.search,
        page: filters.page,
        page_size: filters.page_size ?? 50,
      },
    });
  },

  detail(id: string): Promise<ServiceWithOrganization> {
    return apiClient.get<ServiceWithOrganization>(`/services/${id}/`);
  },

  create(
    payload: ServiceInput & { organization_id: string },
  ): Promise<ServiceWithOrganization> {
    return apiClient.post<ServiceWithOrganization>("/services/", payload);
  },

  update(id: string, payload: ServiceInput): Promise<ServiceWithOrganization> {
    return apiClient.put<ServiceWithOrganization>(`/services/${id}/`, payload);
  },

  remove(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/services/${id}/`);
  },
};
