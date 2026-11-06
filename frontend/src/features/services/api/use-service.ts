"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ServiceFilters, ServiceInput } from "@/types";

import { categoriesApi } from "./get-categories";
import { servicesApi } from "./get-services";

/**
 * Query keys.
 *
 * docs/01_Project_Vision.md:289 and docs/08_Development_Roadmap.md:533 rate
 * cross-tenant cache leakage as Critical, so every service key is scoped by the
 * full filter set, including the organization id when one is present.
 */
export const serviceKeys = {
  all: ["services"] as const,
  list: (filters: ServiceFilters = {}) => [...serviceKeys.all, "list", filters] as const,
  detail: (id: string) => [...serviceKeys.all, "detail", id] as const,
  categories: ["categories"] as const,
};

export function useServices(filters: ServiceFilters = {}) {
  return useQuery({
    queryKey: serviceKeys.list(filters),
    queryFn: () => servicesApi.list(filters),
  });
}

/** The shared category vocabulary used by the service form and filters. */
export function useCategories() {
  return useQuery({
    queryKey: serviceKeys.categories,
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useService(id: string | null) {
  return useQuery({
    queryKey: serviceKeys.detail(id ?? ""),
    queryFn: () => servicesApi.detail(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateServices() {
  const queryClient = useQueryClient();

  return (organizationId?: string) => {
    void queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    if (organizationId) {
      void queryClient.invalidateQueries({
        queryKey: serviceKeys.list({ organization_id: organizationId }),
      });
    }
  };
}

export function useCreateService(organizationId: string) {
  const invalidate = useInvalidateServices();

  return useMutation({
    mutationFn: (payload: ServiceInput) =>
      servicesApi.create({ ...payload, organization_id: organizationId }),
    onSuccess: () => invalidate(organizationId),
  });
}

export function useDeleteService(organizationId?: string) {
  const invalidate = useInvalidateServices();

  return useMutation({
    mutationFn: (id: string) => servicesApi.remove(id),
    onSuccess: () => invalidate(organizationId),
  });
}

/**
 * Updates an existing catalogue entry.
 *
 * Sprint 4 (docs/09_Sprint_Plan.md:291-308) lists "Edit service" as part of the
 * service-management deliverable.
 */
export function useUpdateService(organizationId?: string) {
  const invalidate = useInvalidateServices();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ServiceInput }) =>
      servicesApi.update(id, payload),
    onSuccess: (service) => invalidate(organizationId ?? service.organization_id),
  });
}
