"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { organizationKeys } from "@/features/organizations";
import type { VerificationClaimInput } from "@/types";

import { verificationApi } from "./get-verification";

/** Query keys. Admin data is fetched on demand and never prefetched. */
export const verificationKeys = {
  all: ["verification"] as const,
  claims: () => [...verificationKeys.all, "claims"] as const,
  auditLogs: () => [...verificationKeys.all, "audit-logs"] as const,
};

export function useSubmitVerificationClaim(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      payload: Omit<VerificationClaimInput, "organization_id">,
    ) => verificationApi.submitClaim(organizationId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: verificationKeys.all });
      // A new claim resets `organization.verification_status` to PENDING.
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.detail(organizationId),
      });
    },
  });
}

export function useVerificationClaims(enabled: boolean) {
  return useQuery({
    queryKey: verificationKeys.claims(),
    queryFn: verificationApi.listClaims,
    enabled,
  });
}

export function useDecideVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "APPROVE" | "REJECT" }) =>
      verificationApi.decide(id, decision),
    onSuccess: (claim) => {
      void queryClient.invalidateQueries({ queryKey: verificationKeys.all });
      // The decision updates the organization's public profile, so refetch it.
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.detail(claim.organization_id),
      });
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

export function useAuditLogs(enabled: boolean) {
  return useQuery({
    queryKey: verificationKeys.auditLogs(),
    queryFn: verificationApi.listAuditLogs,
    enabled,
  });
}
