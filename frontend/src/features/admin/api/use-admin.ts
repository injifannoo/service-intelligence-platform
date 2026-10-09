"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ADMIN_ROLES } from "@/config/site-config";
import { useCurrentUser } from "@/features/authentication";
import { reviewKeys } from "@/features/reviews";
import { apiClient, apiPaginated } from "@/lib/api-client";
import type {
  AdminStats,
  AdminUser,
  AdminUserCreateInput,
  AdminUserFilters,
  AdminUserUpdateInput,
  HomepageSettings,
  HomepageSettingsUpdate,
  ModerationInput,
  ModerationReport,
} from "@/types";

/**
 * Admin-area data layer.
 *
 * All assumed contracts: docs/05_API_Design.md documents no admin endpoint.
 *
 * Every hook here is only mounted from inside the `/admin` layout, which gates on
 * role, so the queries do not repeat the role check. The endpoints enforce it
 * regardless, which is what makes the client-side gate a convenience rather than
 * the control.
 */

export const adminKeys = {
  all: ["admin"] as const,
  stats: () => [...adminKeys.all, "stats"] as const,
  users: (filters: AdminUserFilters) => [...adminKeys.all, "users", filters] as const,
  reports: () => [...adminKeys.all, "reports"] as const,
  homepage: () => [...adminKeys.all, "homepage"] as const,
};

/**
 * Shared role probe for admin sub-pages.
 *
 * `AdminShell` already refuses to render children for a non-admin, so this is
 * not the access control — the admin endpoints enforce the role server-side. It
 * exists only to keep the underlying queries from firing before the role is
 * known, since the tables take an `enabled` flag rather than fetching blindly.
 */
export function useIsPlatformAdmin() {
  const { data: user } = useCurrentUser();
  return user !== undefined && ADMIN_ROLES.includes(user.role);
}

/**
 * GET /api/v1/admin/stats/ — counts for the overview page.
 *
 * `retry: false` because a 403 here means "you are not an admin", and retrying a
 * permission error just delays the redirect.
 */
export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: () => apiClient.get<AdminStats>("/admin/stats/"),
    enabled,
    retry: false,
  });
}

/**
 * GET /api/v1/admin/users/
 *
 * Uses `apiPaginated` so the table can show the total count alongside the page,
 * matching how the organization list renders its result count.
 */
export function useAdminUsers(filters: AdminUserFilters, enabled = true) {
  return useQuery({
    queryKey: adminKeys.users(filters),
    queryFn: () => {
      const search = new URLSearchParams();
      if (filters.query) search.set("query", filters.query);
      if (filters.role) search.set("role", filters.role);
      if (filters.status !== undefined) search.set("status", String(filters.status));
      search.set("page_size", "50");

      return apiPaginated<AdminUser>(`/admin/users/?${search.toString()}`);
    },
    enabled,
    retry: false,
  });
}

/**
 * POST /api/v1/admin/users/ — Super Admin only.
 *
 * Invalidates both the user table and the overview counts, since creating an
 * account changes both.
 */
export function useCreateAdminUser() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminUserCreateInput) =>
      apiClient.post<AdminUser>("/admin/users/", input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

/**
 * PATCH /api/v1/admin/users/{id}/ — role change is Super Admin only, status
 * change is open to Admin subject to the target guards.
 */
export function useUpdateAdminUser() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: AdminUserUpdateInput & { id: string }) =>
      apiClient.patch<AdminUser>(`/admin/users/${id}/`, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

/**
 * GET /api/v1/admin/reports/ — the abuse-reporting queue.
 *
 * Required by docs/02:127 ("manual abuse reporting queues") and docs/02:314
 * ("Reviews are moderated"); see the handler for the assumption note. `retry:
 * false` for the same reason as `useAdminStats` — a 403 is a permission answer,
 * not a transient failure.
 */
export function useModerationReports(enabled = true) {
  return useQuery({
    queryKey: adminKeys.reports(),
    queryFn: () => apiPaginated<ModerationReport>("/admin/reports/?page_size=50"),
    enabled,
    retry: false,
  });
}

/**
 * POST /api/v1/admin/reports/{id}/ — dismiss a report or remove the review.
 *
 * Resolving an item changes three things at once: the queue, the overview
 * counts, and whatever customer-facing review list still holds the review. All
 * three key families are invalidated together so the admin overview cannot keep
 * showing a report count the queue no longer backs.
 */
export function useDecideModeration() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: ModerationInput & { id: string }) =>
      apiClient.post<{ action: string; review_id: string }>(`/admin/reports/${id}/`, {
        action,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: adminKeys.all });
      void client.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}

/**
 * GET /api/v1/settings/homepage/ — which homepage sections are switched on.
 *
 * The endpoint itself is public; the admin editor still gates the query on the
 * role so it never fires for a non-admin who somehow reaches the component.
 */
export function useHomepageSettings(enabled = true) {
  return useQuery({
    queryKey: adminKeys.homepage(),
    queryFn: () => apiClient.get<HomepageSettings>("/settings/homepage/"),
    enabled,
    retry: false,
  });
}

/**
 * PUT /api/v1/settings/homepage/ — Super Admin only.
 *
 * Invalidating the whole admin list after a save is overkill, but the cache key
 * is deliberately shared with the homepage query used by the public site, so a
 * saved toggle is reflected there on its next fetch.
 */
export function useUpdateHomepageSettings() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: HomepageSettingsUpdate) =>
      apiClient.put<HomepageSettings>("/settings/homepage/", input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: adminKeys.homepage() });
    },
  });
}
