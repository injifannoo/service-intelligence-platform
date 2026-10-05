"use client";

import { useMutation } from "@tanstack/react-query";

import type { ComparisonRequest } from "@/types";

import { comparisonApi } from "./get-comparison";

/**
 * Query keys.
 *
 * Comparisons are not cached by id: they are derived from a user-chosen set of
 * organizations, so the request variables are the identity.
 */
export const comparisonKeys = {
  all: ["comparison"] as const,
};

export function useCompare() {
  return useMutation({
    mutationFn: (payload: ComparisonRequest) => comparisonApi.compare(payload),
  });
}
