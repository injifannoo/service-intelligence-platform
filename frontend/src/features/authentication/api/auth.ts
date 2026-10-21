import { apiClient, tokenStore } from "@/lib/api-client";
import type { UserProfile } from "@/types";

import type { LoginResponse, RegisterInput, RegisterResponse } from "../types";

/**
 * Auth transport, docs/05_API_Design.md:137-194.
 *
 * These calls are `anonymous` because they are the source of the bearer token
 * rather than consumers of it.
 */
export const authApi = {
  async register(input: RegisterInput): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>("/auth/register/", input, {
      anonymous: true,
    });
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const tokens = await apiClient.post<LoginResponse>(
      "/auth/login/",
      { email, password },
      { anonymous: true },
    );
    tokenStore.set(tokens);
    return tokens;
  },

  async logout(): Promise<void> {
    try {
      // Django can only revoke a refresh token it receives; the access token is
      // stateless and simply expires. The BFF accepted no body here, but the
      // backend blacklists this token so signing out is immediate.
      await apiClient.post<void>("/auth/logout/", {
        refresh_token: tokenStore.getRefreshToken(),
      });
    } finally {
      // Local session is cleared even if the network call fails, otherwise a
      // user can get stuck in a half-authenticated state.
      tokenStore.clear();
    }
  },

  async me(): Promise<UserProfile> {
    return apiClient.get<UserProfile>("/users/profile/");
  },
};
