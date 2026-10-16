import type { UserRole } from "@/types";

/**
 * Application constants and environment maps.
 *
 * Lives here rather than in `lib/` because both `lib/api-client.ts` and the
 * root `proxy.ts` need the auth cookie names, and proxy must not pull in the
 * whole API client.
 */
export const siteConfig = {
  name: "AI Powered System Intelligent Platform",
  shortName: "ASIP",
  tagline: "Smarter Decisions. Better Services.",
  description:
    "AI-powered directory, analytics, and recommendation platform for confident service decisions.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/**
 * When true, `API_BASE_URL` points at the in-repo BFF route handlers under
 * `src/app/api/` instead of the Django API.
 *
 * The Django slices are not implemented yet (`config/urls.py` registers only
 * `admin/`), so without this every request fails and no screen is developable.
 * Set to `false` once `backend/features/*` are live â€” no feature-slice code has
 * to change, because the BFF returns the identical envelope and error codes.
 */
export const USE_DEV_BACKEND = process.env.NEXT_PUBLIC_USE_DEV_BACKEND === "true";

/**
 * Base URL for the API. Must include the version prefix â€” the `.env.example`
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
] as const;

/**
 * Sidebar for the separate admin workspace at `/admin`.
 *
 * Kept out of `DASHBOARD_NAV` on purpose: an admin lands in the admin shell, not
 * the customer one, and mixing moderation chrome into the customer header is what
 * this split avoids.
 *
 * `roles` marks the Super Admin only sections. Account and role management is the
 * single capability that separates the tiers (docs/02:96-104), so the sidebar
 * hides it from a regular Admin rather than letting them click into a 403.
 */
export const ADMIN_NAV: readonly NavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users & roles", href: "/admin/users", roles: ["SUPER_ADMIN"] },
  { label: "Homepage", href: "/admin/homepage", roles: ["SUPER_ADMIN"] },
  { label: "Organizations", href: "/admin/organizations" },
  { label: "Moderation", href: "/admin/moderation" },
  { label: "Verification queue", href: "/admin/verification" },
  { label: "Audit log", href: "/admin/audit-logs" },
] as const;

/** Roles that may enter the `/admin` area at all. */
export const ADMIN_ROLES: readonly UserRole[] = ["ADMIN", "SUPER_ADMIN"];

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
  /**
   * Business signup, step 1 of the guided onboarding (docs/09:256-278).
   * Separate from `/register` so a business account is created with a business
   * intent and continues straight into the organization profile, instead of
   * landing on the customer directory with a hidden create dialog.
   */
  businessRegister: "/register/business",
  /** Step 2: the organization profile, only reachable while signed in. */
  businessOnboarding: "/onboarding/organization",
  organizations: "/organizations",
  search: "/search",
  comparison: "/comparison",
  /** Legacy customer-area path; the queue now lives under `/admin/verification`. */
  verification: "/verification",
  profile: "/profile",
  privacy: "/privacy",
  terms: "/terms",
  admin: "/admin",
  adminUsers: "/admin/users",
  adminHomepage: "/admin/homepage",
  adminOrganizations: "/admin/organizations",
  adminModeration: "/admin/moderation",
  adminVerification: "/admin/verification",
  adminAuditLogs: "/admin/audit-logs",
} as const;

/**
 * Where a freshly signed-in account should land.
 *
 * Admins open the admin area rather than the customer organization list: sending
 * them to `/organizations` would look like the admin area was missing, and they
 * have no reason to browse tenants. Every other role keeps the customer landing.
 */
export function landingRouteForRole(role: UserRole | undefined): string {
  return role !== undefined && ADMIN_ROLES.includes(role) ? ROUTES.admin : ROUTES.organizations;
}

/**
 * Validates the `?next=` value the proxy attaches when it bounces a signed-out
 * visitor off a protected route.
 *
 * This is user-controlled input that ends up as a redirect target, so it is
 * treated as an open-redirect risk rather than trusted:
 *  - `//evil.com` and `/\evil.com` are protocol-relative URLs that leave the site
 *  - `https://evil.com` and any other scheme are absolute
 *  - a bare `?`/`#` or a relative path has no place to send the user
 *
 * Only a plain absolute path within this app is accepted. Returning `null` means
 * "no usable destination", and the caller falls back to the role landing.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  // Reject anything that is not a single-slash-prefixed path. `//host` and
  // `/\host` are the two spellings browsers resolve as protocol-relative.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;

  return next;
}
