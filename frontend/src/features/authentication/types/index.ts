import type { AuthTokens, User } from "@/types";

/** docs/05_API_Design.md:141-146 */
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
}

/**
 * docs/05_API_Design.md:169-184 documents login as a bare
 * `{ access_token, refresh_token }` payload with no success envelope, unlike
 * every other endpoint. `api-client` tolerates both shapes so this stays a
 * plain type rather than a union.
 */
export type LoginResponse = AuthTokens;

export interface Session {
  user: User;
  tokens: AuthTokens;
}

export interface AuthFieldErrors {
  name?: string[];
  email?: string[];
  password?: string[];
}
