import { NextResponse, type NextRequest } from "next/server";

import {
  findUserById,
  isRefreshToken,
  isSubjectRevoked,
  readTokenSubject,
  type StoredUser,
} from "./store";
import { RATING_DIMENSIONS, type RatingDimension, type ReviewScores } from "@/types";

/**
 * Guards every dev-backend route.
 *
 * Returns a 404 (not a 403) in production so the mock API does not exist at all
 * on a real deployment, rather than existing but refusing to answer.
 */
export function devBackendUnavailable(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    );
  }
  return null;
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T): NextResponse {
  return ok(data, 201);
}

export function accepted<T>(data: T): NextResponse {
  return ok(data, 202);
}

export function paginated<T>(
  data: T[],
  pagination: {
    count: number;
    next: string | null;
    previous: string | null;
    page_size: number;
  },
): NextResponse {
  return NextResponse.json({ success: true, data, pagination });
}

/** Error shape per docs/05_API_Design.md:224-235. */
export function failure(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message, details } },
    { status },
  );
}

/**
 * Resolves the bearer token to a user, or returns a 401 response.
 *
 * Mirrors what DRF's authentication classes will do, so status codes and error
 * codes the frontend handles stay identical once the real backend is wired in.
 */
export function requireUser(request: NextRequest): {
  user: StoredUser;
} | { response: NextResponse } {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return {
      response: failure(401, "NOT_AUTHENTICATED", "Authentication credentials were not provided."),
    };
  }

  const token = header.slice("Bearer ".length);

  if (isRefreshToken(token)) {
    // A refresh token must never be usable as an access credential.
    return {
      response: failure(401, "INVALID_TOKEN", "Token is invalid or expired."),
    };
  }

  const subject = readTokenSubject(token);
  if (!subject) {
    return { response: failure(401, "INVALID_TOKEN", "Token is invalid or expired.") };
  }

  const user = findUserById(subject);
  if (!user || isSubjectRevoked(subject)) {
    return { response: failure(401, "INVALID_TOKEN", "Token is invalid or expired.") };
  }

  return { user };
}

/**
 * Like `requireUser`, but also enforces a role.
 *
 * docs/02:112,235 require RBAC and docs/03:330-331 place permissions in the
 * backend, so the real enforcement belongs in DRF permission classes. This
 * mirrors it so the frontend exercises the same 403 shape.
 */
export function requireRole(
  request: NextRequest,
  allowed: readonly StoredUser["role"][],
): { user: StoredUser } | { response: NextResponse } {
  const auth = requireUser(request);
  if ("response" in auth) return auth;

  if (!allowed.includes(auth.user.role)) {
    return { response: failure(403, "PERMISSION_DENIED", "You do not have permission to perform this action.") };
  }

  return auth;
}

/**
 * Account and role management.
 *
 * This is the only capability that separates Super Admin from Admin, per
 * docs/02:96-104 ("Platform Admin" moderates; "Super Admin" manages platform
 * configuration) — narrowed to accounts here because no settings model exists yet.
 *
 * Without this, SUPER_ADMIN is identical to ADMIN: every check before it was an
 * allow-list containing both, so the role granted nothing extra.
 */
export function requireSuperAdmin(
  request: NextRequest,
): { user: StoredUser } | { response: NextResponse } {
  return requireRole(request, ["SUPER_ADMIN"]);
}

/**
 * Stops an account from being edited by the tier that is not allowed to.
 *
 * Account management is Super Admin-only, enforced upstream by
 * `requireSuperAdmin`, so the only rule left here is the self-targeting one: a
 * Super Admin must not be able to demote or deactivate themselves, which would
 * leave the platform with no account able to manage accounts. The same guard
 * also blocks an Admin reaching this route with a crafted request.
 */
export function guardSelfTarget(actor: StoredUser, target: StoredUser): NextResponse | null {
  if (target.id === actor.id) {
    return failure(
      403,
      "PERMISSION_DENIED",
      "You cannot change your own role or status.",
    );
  }

  return null;
}

export interface PageParams {
  page: number;
  pageSize: number;
  offset: number;
}

/** Parses `?page=&page_size=`, clamped to sane bounds. */
export function readPageParams(searchParams: URLSearchParams): PageParams {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("page_size")) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

/** Slices an already-filtered list and emits the documented pagination block. */
export function paginate<T>(
  items: T[],
  params: PageParams,
  query: Record<string, string | number | undefined> = {},
): NextResponse {
  const slice = items.slice(params.offset, params.offset + params.pageSize);
  const hasNext = params.offset + params.pageSize < items.length;
  const hasPrevious = params.page > 1;

  const buildLink = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") search.set(key, String(value));
    }
    search.set("page", String(target));
    search.set("page_size", String(params.pageSize));
    return `?${search.toString()}`;
  };

  return paginated(slice, {
    count: items.length,
    next: hasNext ? buildLink(params.page + 1) : null,
    previous: hasPrevious ? buildLink(params.page - 1) : null,
    page_size: params.pageSize,
  });
}

/** Parses a JSON body, returning `null` when the body is absent or malformed. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

/**
 * Validates an optional `ratings` breakdown for review create/edit.
 *
 * docs/04:357-375 names the dimensions without giving them columns; unknown
 * keys are rejected so a typo like `custumer_service` cannot be silently
 * dropped. Returns `undefined` when the body omitted the key entirely, and
 * collects per-dimension errors into the `details` block otherwise.
 */
export function readRatingScores(
  value: unknown,
  errors: FieldErrors,
): Partial<ReviewScores> | undefined {
  if (value === undefined) return undefined;

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.add("ratings", "Ratings must be an object with one score per dimension.");
    return undefined;
  }

  const scores: Partial<ReviewScores> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!RATING_DIMENSIONS.includes(key as RatingDimension)) {
      errors.add(`ratings.${key}`, "Unknown rating dimension.");
      continue;
    }

    const score = num(raw);
    if (score === undefined || !Number.isInteger(score) || score < 1 || score > 5) {
      errors.add(
        `ratings.${key}`,
        "Each dimension must be a whole number between 1 and 5.",
      );
      continue;
    }

    scores[key as RatingDimension] = score;
  }
  return scores;
}

/** Collects per-field messages into the `details` block of a 400. */
export class FieldErrors {
  private readonly details: Record<string, string[]> = {};

  add(field: string, message: string) {
    (this.details[field] ??= []).push(message);
    return this;
  }

  get isEmpty() {
    return Object.keys(this.details).length === 0;
  }

  toResponse() {
    return failure(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", this.details);
  }
}
