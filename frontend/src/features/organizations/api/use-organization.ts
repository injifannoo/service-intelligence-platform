"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type {
  AiTaskResult,
  OrganizationFilters,
  OrganizationInput,
  ReviewSummary,
} from "@/types";

import { organizationsApi } from "./get-organizations";

/**
 * Query keys.
 *
 * Every organization-scoped key carries the tenant id. Omitting it would let
 * one tenant's cached analytics satisfy another tenant's request, which is the
 * cross-tenant leak docs/01_Project_Vision.md:289 and
 * docs/08_Development_Roadmap.md:533 rate as Critical.
 */
export const organizationKeys = {
  all: ["organizations"] as const,
  list: (filters: OrganizationFilters) =>
    [...organizationKeys.all, "list", filters] as const,
  detail: (id: string) => [...organizationKeys.all, "detail", id] as const,
  aiSummaryTask: (id: string, taskId: string) =>
    [...organizationKeys.all, "ai-summary", id, taskId] as const,
  dashboard: (id: string) => [...organizationKeys.all, "dashboard", id] as const,
};

export function useOrganizations(filters: OrganizationFilters = {}) {
  return useQuery({
    queryKey: organizationKeys.list(filters),
    queryFn: () => organizationsApi.list(filters),
  });
}

/**
 * Fetches the organization profile, which nests the service catalogue and the
 * aggregate review count (docs/05_API_Design.md:324-332).
 */
export function useOrganization(id: string | null) {
  return useQuery({
    queryKey: organizationKeys.detail(id ?? ""),
    queryFn: () => organizationsApi.detail(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateOrganizations() {
  const queryClient = useQueryClient();

  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.detail(id) });
    }
  };
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateOrganizations();

  return useMutation({
    mutationFn: organizationsApi.create,
    onSuccess: () => {
      invalidate();
      // Registering an organization also changes the caller: they become its
      // owner and an ORGANIZATION_OWNER. The header, profile, and every
      // role-gated surface read the auth cache, so it must be refetched rather
      // than left showing the pre-registration role. The root key literal
      // mirrors AUTH_QUERY_KEY in features/authentication/api/use-auth.ts.
      void queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useUpdateOrganization() {
  const invalidate = useInvalidateOrganizations();

  return useMutation({
    mutationFn: (variables: { id: string; payload: OrganizationInput }) =>
      organizationsApi.update(variables.id, variables.payload),
    onSuccess: (organization) => invalidate(organization.id),
  });
}

/**
 * Triggers the asynchronous AI review summarisation job.
 *
 * Returns 202 with a task id rather than a summary, because AI work must not
 * block the write path (docs/02_Product_Requirements.md:317). Feed the returned
 * `task_id` into `useAiReviewSummaryTask` to resolve it.
 */
export function useRequestAiReviewSummary() {
  return useMutation({
    mutationFn: (organizationId: string) =>
      apiClient.post<{ task_id: string; status: string }>(
        `/organizations/${organizationId}/ai/review-summary/`,
      ),
  });
}

/**
 * Polls an AI task to completion.
 *
 * Contract: docs/05_API_Design.md:526-540 and
 * docs/12_Testing_Strategy.md:204-206 (PENDING -> SUCCESS). Polling stops as
 * soon as the task settles so a failed job does not poll forever.
 */
export function useAiReviewSummaryTask(
  organizationId: string | null,
  taskId: string | null,
) {
  return useQuery({
    queryKey: organizationKeys.aiSummaryTask(organizationId ?? "", taskId ?? ""),
    queryFn: () =>
      // Typed as the summary payload so consumers do not have to cast `result`.
      // The generic lives here because this is the only task whose result shape is
      // known; a generic `AiTask<unknown>` would just move the cast elsewhere.
      apiClient.get<AiTaskResult<ReviewSummary>>(`/ai/tasks/${taskId as string}/`),
    enabled: Boolean(organizationId && taskId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "SUCCESS" || status === "FAILURE" ? false : 3000;
    },
  });
}
