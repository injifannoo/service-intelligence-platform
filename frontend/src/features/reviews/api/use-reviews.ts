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

/**
 * Edit an own review (docs/02:181) and delete it (docs/02:182).
 *
 * Both invalidate the organization row as well as the list: a rating change
 * moves the organization's aggregate rating and a deletion removes a vote from
 * it, and docs/04 keeps that average server-computed rather than stored.
 */
export function useUpdateReview(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      rating,
      comment,
    }: {
      id: string;
      rating?: number;
      comment?: string | null;
    }) => reviewsApi.update(id, { rating, comment }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: reviewKeys.byOrganization(organizationId),
      });
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.detail(organizationId),
      });
    },
  });
}

export function useDeleteReview(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => reviewsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: reviewKeys.byOrganization(organizationId),
      });
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.detail(organizationId),
      });
    },
  });
}
