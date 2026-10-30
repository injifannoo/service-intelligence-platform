import { describe, expect, it } from "vitest";

import { landingRouteForRole, safeNextPath, ROUTES } from "./site-config";

describe("safeNextPath", () => {
  it("keeps an in-app path", () => {
    expect(safeNextPath("/organizations")).toBe("/organizations");
    expect(safeNextPath("/admin/users")).toBe("/admin/users");
  });

  it("keeps a nested path and its query string", () => {
    expect(safeNextPath("/organizations/abc/analytics?tab=reviews")).toBe(
      "/organizations/abc/analytics?tab=reviews",
    );
  });

  it("rejects a protocol-relative URL", () => {
    // `//evil.com` is a valid absolute URL to the browser, so an unvalidated
    // `next` would turn sign-in into an open redirect off the site.
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("//evil.com/path")).toBeNull();
  });

  it("rejects the backslash spelling of a protocol-relative URL", () => {
    // Browsers normalise `/\` to `//`, so this is the same attack in a form that
    // a naive `startsWith("//")` check would miss.
    expect(safeNextPath("/\\evil.com")).toBeNull();
  });

  it("rejects absolute URLs", () => {
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("http://evil.com")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects a relative path", () => {
    // A relative destination resolves against the current route, which is not a
    // predictable place to land.
    expect(safeNextPath("organizations")).toBeNull();
    expect(safeNextPath("../admin")).toBeNull();
  });

  it("treats a missing value as no destination", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });
});

describe("landingRouteForRole", () => {
  it("sends both admin tiers to the admin area", () => {
    expect(landingRouteForRole("ADMIN")).toBe(ROUTES.admin);
    expect(landingRouteForRole("SUPER_ADMIN")).toBe(ROUTES.admin);
  });

  it("sends customers and owners to the organization list", () => {
    expect(landingRouteForRole("CUSTOMER")).toBe(ROUTES.organizations);
    expect(landingRouteForRole("ORGANIZATION_OWNER")).toBe(ROUTES.organizations);
  });

  it("falls back to the organization list when the role is unknown", () => {
    // A failed profile fetch must not strand anyone on /admin.
    expect(landingRouteForRole(undefined)).toBe(ROUTES.organizations);
  });
});
