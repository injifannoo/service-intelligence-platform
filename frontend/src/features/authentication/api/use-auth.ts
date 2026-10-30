"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { tokenStore } from "@/lib/api-client";
import type { UserProfile } from "@/types";

import { authApi } from "./auth";
import type { RegisterInput } from "../types";

/** Root of every server-state cache key, so logout can clear it wholesale. */
export const AUTH_QUERY_KEY = ["auth"] as const;

export const authKeys = {
  all: AUTH_QUERY_KEY,
  currentUser: () => [...AUTH_QUERY_KEY, "me"] as const,
};

/**
 * Current user.
 *
 * Session identity is server state, so it lives in React Query rather than the
 * Zustand store — per docs/07_Project_Structure.md:222-223. `enabled` is false
 * when no token is present so the hook never fires an unauthenticated request
 * on public pages.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: authApi.me,
    enabled: tokenStore.getAccessToken() !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      await authApi.login(email, password);
      // `/auth/login/` returns only a token pair. The landing route depends on the
      // role, so the profile is fetched once here rather than leaving the caller to
      // guess and render the wrong destination first.
      return authApi.me();
    },
    onSuccess: (user) => {
      // Seeded rather than invalidated: the layout and header both read the
      // current user on arrival, so refetching it immediately would be a second
      // request for an answer already in hand.
      queryClient.setQueryData(authKeys.currentUser(), user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export type { UserProfile };
