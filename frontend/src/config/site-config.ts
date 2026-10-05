import type { UserRole } from "@/types";

/**
 * Application constants and environment maps.
 *
 * Lives here rather than in `lib/` because both `lib/api-client.ts` and the
 * root `proxy.ts` need the auth cookie names, and proxy must not pull in the
 * whole API client.
 */
export const siteConfig = {
  name: "AI-Powered System Intelligence Platform",
  shortName: "ASIP",
  description:
    "AI-powered directory, analytics, and recommendation engine for trusted service decisions.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/**
 * When true, `API_BASE_URL` points at the in-repo BFF route handlers under
 * `src/app/api/` instead of the Django API.
 *
 * The Django slices are not implemented yet (`config/urls.py` registers only
 * `admin/`), so without this every request fails and no screen is developable.
 * Set to `false` once `backend/features/*` are live — no feature-slice code has
 * to change, because the BFF returns the identical envelope and error codes.
 */
export const USE_DEV_BACKEND = process.env.NEXT_PUBLIC_USE_DEV_BACKEND === "true";

/**
 * Base URL for the API. Must include the version prefix — the `.env.example`
 * value is `http://localhost:8000/api/v1`, so feature modules append paths like
 * `/organizations/` without repeating `/api/v1`.
 */
export const API_BASE_URL = USE_DEV_BACKEND
  ? "/api/v1"
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1");

/**
 * Auth cookies are readable from both the browser and `proxy.ts`, which is
 * what lets the dashboard route group be guarded server-side.
 */
export const AUTH_COOKIES = {
  accessToken: "asip_access_token",
  refreshToken: "asip_refresh_token",
} as const;

export const AUTH_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
} as const;

export interface NavItem {
  label: string;
  href: string;
  /** Undefined means visible to every signed-in role. */
  roles?: readonly UserRole[];
}

export const DASHBOARD_NAV: readonly NavItem[] = [
  { label: "Organizations", href: "/organizations" },
  { label: "Search", href: "/search" },
  { label: "Compare", href: "/comparison" },
  { label: "Verification", href: "/verification", roles: ["ADMIN", "SUPER_ADMIN"] },
] as const;

/**
 * Phase 1 rollout is deliberately limited to Technology Services
 * (docs/08_Development_Roadmap.md:314-325). Remaining industries are listed so
 * the taxonomy is visible in the UI before their slices exist.
 */
export const PHASE_ONE_INDUSTRIES = [
  "Software",
  "AI",
  "IT Services",
  "Digital Agency",
  "Cybersecurity",
] as const;

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  organizations: "/organizations",
  search: "/search",
  comparison: "/comparison",
  verification: "/verification",
  profile: "/profile",
} as const;
