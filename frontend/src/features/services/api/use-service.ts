"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ServiceInput } from "@/types";

import { servicesApi } from "./get-services";

/**
 * Query keys.
 *
 * docs/01_Project_Vision.md:289 and docs/08_Development_Roadmap.md:533 rate
 * cross-tenant cache leakage as Critical, so every key is scoped by
 * organization id.
 */
export const serviceKeys = {
  all: ["services"] as const,
  list: (organizationId?: string) =>
    [...serviceKeys.all, "list", organizationId ?? "all"] as const,
  detail: (id: string) => [...serviceKeys.all, "detail", id] as const,
};

export function useServices(organizationId?: string) {
  return useQuery({
    queryKey: serviceKeys.list(organizationId),
    queryFn: () => servicesApi.list(organizationId),
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
      void queryClient.invalidateQueries({ queryKey: serviceKeys.list(organizationId) });
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
