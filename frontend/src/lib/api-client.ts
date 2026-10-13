import {
  API_BASE_URL,
  AUTH_COOKIE_OPTIONS,
  AUTH_COOKIES,
  USE_DEV_BACKEND,
} from "@/config/site-config";
import type { ApiErrorBody, ApiResponse, AuthTokens, Pagination } from "@/types";

/**
 * Central network wrapper, per docs/07_Project_Structure.md:202 and the
 * Sprint 1 task in docs/09_Sprint_Plan.md:199.
 *
 * Responsibilities, and nothing else:
 *   1. Prefix every path with the versioned API base URL.
 *   2. Attach the JWT bearer token.
 *   3. Unwrap the standard `{ success, data, pagination }` envelope.
 *   4. Throw a typed `ApiError` so feature hooks never branch on HTTP codes.
 *
 * Feature modules must not call `fetch` directly.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, body: ApiErrorBody | null, fallback: string) {
    super(body?.message ?? fallback);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code ?? "UNKNOWN_ERROR";
    this.details = body?.details;
  }

  /** Field-level validation failures, keyed by form field name. */
  get fieldErrors(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const [field, value] of Object.entries(this.details ?? {})) {
      if (Array.isArray(value)) {
        out[field] = value.map(String);
      } else {
        out[field] = [String(value)];
      }
    }
    return out;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** True for validation-shaped failures that a form should render inline. */
  get isValidationError() {
    return this.status === 400 || this.status === 422;
  }
}

/* -------------------------------------------------------------------------- */
/* Token storage                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Tokens live in cookies rather than localStorage so that `proxy.ts` can read
 * them and guard the dashboard route group server-side. This is a deliberate
 * trade-off: cookies are sent automatically (CSRF-relevant on mutations) while
 * localStorage is not readable by the server at all. Mutations go through the
 * bearer header, and `sameSite: "lax"` blocks cross-site form posts.
 */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const { path, sameSite, secure, maxAge } = AUTH_COOKIE_OPTIONS;
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `path=${path}`,
    `sameSite=${sameSite}`,
    `maxAge=${maxAge}`,
  ];
  if (secure) parts.push("secure");
  document.cookie = parts.join("; ");
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=${AUTH_COOKIE_OPTIONS.path}; maxAge=0`;
}

export const tokenStore = {
  getAccessToken: () => readCookie(AUTH_COOKIES.accessToken),
  getRefreshToken: () => readCookie(AUTH_COOKIES.refreshToken),

  set(tokens: { access_token: string; refresh_token: string }) {
    writeCookie(AUTH_COOKIES.accessToken, tokens.access_token);
    writeCookie(AUTH_COOKIES.refreshToken, tokens.refresh_token);
  },

  clear() {
    deleteCookie(AUTH_COOKIES.accessToken);
    deleteCookie(AUTH_COOKIES.refreshToken);
  },
};

/* -------------------------------------------------------------------------- */
/* Envelope handling                                                          */
/* -------------------------------------------------------------------------- */

function isEnvelope(body: unknown): body is ApiResponse<unknown> {
  return (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    typeof (body as { success: unknown }).success === "boolean"
  );
}

function readErrorBody(body: unknown): ApiErrorBody | null {
  if (isEnvelope(body) && body.success === false) return body.error;
  return null;
}

/* -------------------------------------------------------------------------- */
/* Request                                                                    */
/* -------------------------------------------------------------------------- */

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** JSON-serialised automatically. */
  body?: unknown;
  /** Skip the bearer header, e.g. for login and registration. */
  anonymous?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
  /**
   * Internal. Prevents the refresh call itself from recursing into a refresh
   * attempt when it is rejected with a 401.
   */
  skipAuthRetry?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const absolute = path.startsWith("/") ? path : `/${path}`;

  // Django's API addresses resources with a trailing slash (`/auth/login/`,
  // per docs/05_API_Design.md), but the Next router has no trailing-slash
  // routes and answers `/auth/login/` with a 308 to `/auth/login`. Normalise at
  // this one boundary so the BFF is addressed directly, instead of paying a
  // redirect round-trip on every request and relying on the client to replay
  // the body and method across it. Django URLs are left untouched.
  const resolved = USE_DEV_BACKEND ? absolute.replace(/\/+$/, "") || "/" : absolute;

  const url = `${API_BASE_URL}${resolved}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/* -------------------------------------------------------------------------- */
/* Access token refresh                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Deduplicates concurrent refreshes. Several queries can 401 at once, and
 * without this they would each mint a new token, racing on the cookie write.
 */
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchanges the refresh token for a new pair. Resolves `false` (and clears the
 * stored tokens) when the session cannot be recovered, which is the signal for
 * callers to send the user back to the sign-in screen.
 *
 * docs/11_Deployment.md:460 requires 15-minute access tokens, so a long-lived
 * tab will otherwise 401 on its next fetch with nothing to recover it.
 */
async function refreshAccessToken(): Promise<boolean> {
  const current = tokenStore.getRefreshToken();
  if (!current) return false;

  refreshInFlight ??= (async () => {
    try {
      const tokens = await apiRequest<AuthTokens>("/auth/refresh/", {
        method: "POST",
        anonymous: true,
        skipAuthRetry: true,
        body: { refresh_token: current },
      });
      tokenStore.set(tokens);
      return true;
    } catch {
      tokenStore.clear();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/* -------------------------------------------------------------------------- */
/* Request                                                                    */
/* -------------------------------------------------------------------------- */

interface RawResult {
  response: Response;
  payload: unknown;
}

function toError(response: Response, payload: unknown): ApiError {
  return new ApiError(
    response.status,
    readErrorBody(payload),
    response.statusText || "Request failed",
  );
}

/**
 * Performs one request with no auth-retry logic, so `apiRequest` and
 * `apiPaginated` can share the exact same send, parse, and recover behaviour.
 */
async function send(
  url: string,
  init: RequestInit,
  options: RequestOptions,
): Promise<RawResult> {
  const { anonymous, skipAuthRetry } = options;

  const headers = new Headers(init.headers);
  if (!anonymous) {
    const token = tokenStore.getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError(0, null, "Unable to reach the server. Check your connection.");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload: unknown = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401 && !skipAuthRetry) {
      if (await refreshAccessToken()) {
        return send(url, init, { ...options, skipAuthRetry: true });
      }
    }
    throw toError(response, payload);
  }

  return { response, payload };
}

/**
 * Performs a request and returns the unwrapped payload.
 *
 * Throws `ApiError` for both transport failures and `{ success: false }`
 * bodies. The catch-all branch exists because docs/05_API_Design.md returns
 * bare payloads (no envelope) from login and AI search, so a non-envelope 2xx
 * body is passed through untouched rather than treated as an error.
 *
 * A 401 triggers one refresh-and-retry. If that fails, the tokens are cleared
 * and the `ApiError` propagates so the caller can route to the sign-in screen.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (body !== undefined) requestHeaders.set("Content-Type", "application/json");

  const { payload } = await send(buildUrl(path, query), {
    ...rest,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  }, options);

  if (isEnvelope(payload)) {
    if (payload.success === false) {
      throw new ApiError(200, payload.error, "Request failed");
    }
    return payload.data as T;
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),

  /** Added for the admin area, where a partial update must not replace the role. */
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};

/**
 * Paginated counterpart. Returns data and pagination separately so callers do
 * not have to know the envelope shape (docs/05_API_Design.md:209-222).
 */
export async function apiPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T[]; pagination: Pagination | null }> {
  const { query, headers, signal } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  const { payload } = await send(
    buildUrl(path, query),
    { method: "GET", headers: requestHeaders, signal },
    options,
  );

  if (isEnvelope(payload) && payload.success === false) {
    throw new ApiError(200, payload.error, "Request failed");
  }

  if (typeof payload === "object" && payload !== null && "pagination" in payload) {
    const { data, pagination } = payload as { data: T[]; pagination: Pagination };
    return { data, pagination };
  }

  return { data: (payload ?? []) as T[], pagination: null };
}
