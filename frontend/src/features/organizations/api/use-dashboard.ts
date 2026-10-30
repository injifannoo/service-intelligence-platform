"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { OrganizationDashboard } from "@/types";

import { organizationKeys } from "./use-organization";

/**
 * GET /api/v1/organizations/{id}/analytics/dashboard/
 * — docs/05_API_Design.md:591-613.
 *
 * Owner-scoped on the BFF, so this query is only ever enabled for an
 * organization the current user owns. A 403 is treated as "not for you" rather
 * than surfaced as an error, because the correct remedy is to not show the tab.
 */
export function useOrganizationDashboard(organizationId: string | null, enabled = true) {
  return useQuery({
    queryKey: organizationKeys.dashboard(organizationId ?? ""),
    queryFn: () =>
      apiClient.get<OrganizationDashboard>(
        `/organizations/${organizationId as string}/analytics/dashboard/`,
      ),
    enabled: Boolean(organizationId) && enabled,
    retry: false,
  });
}
