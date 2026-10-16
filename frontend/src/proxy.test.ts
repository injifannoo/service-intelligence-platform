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

  it("protects the workspace when there is no token", () => {
    const response = proxy(request("/organizations"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Forganizations",
    );
  });

  it("keeps an empty token shell out of the workspace too", () => {
    const response = proxy(request("/organizations", { [AUTH_COOKIES.accessToken]: "" }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Forganizations",
    );
  });
});
