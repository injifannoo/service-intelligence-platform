import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { AUTH_COOKIES } from "@/config/site-config";
import { proxy } from "./proxy";

/**
 * Route guard behaviour.
 *
 * The guard keys off the access token cookie, so the case that matters is what
 * counts as "has a token". A cleared session leaves an empty `asip_access_token=`
 * behind (see `deleteCookie`), and reading cookie *presence* treated that as
 * signed in — which 307-redirected every `/login` visit to `/organizations` and
 * made the "Sign in" button unusable.
 */
function request(pathname: string, cookies: Record<string, string> = {}) {
  const header = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest(`http://localhost:3000${pathname}`, {
    headers: header ? { cookie: header } : {},
  });
}

describe("proxy session guard", () => {
  it("lets a signed-out visitor reach the login form", () => {
    const response = proxy(request("/login"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("sends a signed-in visitor away from the login form", () => {
    const response = proxy(
      request("/login", { [AUTH_COOKIES.accessToken]: "a-real-token" }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/organizations");
  });

  it("does not treat an empty token shell as a session", () => {
    // Exactly the state a cleared cookie used to leave behind.
    const response = proxy(request("/login", { [AUTH_COOKIES.accessToken]: "" }));

    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });

  it("lets a signed-out visitor browse the directory", () => {
    const response = proxy(request("/organizations"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets a signed-out visitor search and compare", () => {
    for (const pathname of ["/search", "/comparison", "/organizations/abc"]) {
      const response = proxy(request(pathname));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("still protects the organization analytics subtree", () => {
    // The profile is public, but its owner-only analytics are not — a prefix
    // match on `/organizations` would have locked guests out of both.
    const response = proxy(request("/organizations/abc/analytics"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Forganizations%2Fabc%2Fanalytics",
    );
  });

  it("still protects the account and admin areas without a token", () => {
    for (const pathname of ["/profile", "/onboarding/organization", "/admin/users"]) {
      const response = proxy(request(pathname));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `http://localhost:3000/login?next=${encodeURIComponent(pathname)}`,
      );
    }
  });

  it("keeps an empty token shell out of the protected areas too", () => {
    const response = proxy(request("/profile", { [AUTH_COOKIES.accessToken]: "" }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fprofile",
    );
  });
});
