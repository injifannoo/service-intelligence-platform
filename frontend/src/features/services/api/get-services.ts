import { apiClient, apiPaginated } from "@/lib/api-client";
import type { Pagination, Service, ServiceInput } from "@/types";

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
    organizationId?: string,
    page?: number,
  ): Promise<{ data: ServiceWithOrganization[]; pagination: Pagination | null }> {
    return apiPaginated<ServiceWithOrganization>("/services/", {
      query: { organization_id: organizationId, page, page_size: 50 },
    });
  },

  detail(id: string): Promise<Service> {
    return apiClient.get<Service>(`/services/${id}/`);
  },

  create(payload: ServiceInput & { organization_id: string }): Promise<Service> {
    return apiClient.post<Service>("/services/", payload);
  },

  update(id: string, payload: ServiceInput): Promise<Service> {
    return apiClient.put<Service>(`/services/${id}/`, payload);
  },

  remove(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/services/${id}/`);
  },
};
