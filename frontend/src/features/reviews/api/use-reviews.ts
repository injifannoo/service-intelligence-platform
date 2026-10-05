"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { organizationKeys } from "@/features/organizations";
import type { ReviewInput } from "@/types";

import { reviewsApi } from "./get-reviews";

/**
 * Query keys.
 *
 * Reviews are nested under the organization id so a cached review list is never
 * reused across tenants (docs/08_Development_Roadmap.md:533 rates cross-tenant
 * cache leakage as Critical).
 */
export const reviewKeys = {
  all: ["reviews"] as const,
  byOrganization: (organizationId: string) =>
    [...reviewKeys.all, "organization", organizationId] as const,
};

export function useOrganizationReviews(organizationId: string | null) {
  return useQuery({
    queryKey: reviewKeys.byOrganization(organizationId ?? ""),
    queryFn: () => reviewsApi.listForOrganization(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useCreateReview(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReviewInput) => reviewsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: reviewKeys.byOrganization(organizationId),
      });
      // The organization row shows an aggregate rating, so it must be refetched
      // too; docs/04 keeps the rating server-computed rather than stored.
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.detail(organizationId),
      });
    },
  });
}

export function useReportReview(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason, note }: { id: string; reason: string; note?: string }) =>
      reviewsApi.report(id, reason, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: reviewKeys.byOrganization(organizationId),
      });
    },
  });
}
