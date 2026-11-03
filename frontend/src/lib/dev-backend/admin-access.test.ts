import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import {
  ASSIGNABLE_ADMIN_ROLES,
  createAdminUser,
  findUserByEmail,
  isAssignableAdminRole,
  issueTokens,
  listUsers,
  toPublicUser,
  type StoredUser,
} from "@/lib/dev-backend/store";
import {
  guardSelfTarget,
  requireRole,
  requireSuperAdmin,
} from "@/lib/dev-backend/http";

/**
 * Authorization tests for the admin area.
 *
 * These assert the invariants that must not regress, rather than snapshotting
 * response bodies: account management is Super Admin-only, admin-tier roles are
 * the only assignable ones, and no admin can lock themselves out.
 */

function asUser(user: StoredUser) {
  const request = new NextRequest("http://localhost/api/v1/admin/users/");
  request.headers.set("authorization", `Bearer ${issueTokens(user).access_token}`);
  return request;
}

function actorWithRole(email: string, role: StoredUser["role"]): StoredUser {
  const existing = findUserByEmail(email);
  if (existing) {
    existing.role = role;
    return existing;
  }

  // Only ADMIN and SUPER_ADMIN are assignable, so a lower tier is faked directly
  // rather than through `createAdminUser`.
  return {
    id: `test-${role}`,
    name: `Test ${role}`,
    email,
    password: "Password123!",
    role,
    status: true,
    created_at: new Date().toISOString(),
    organization_id: null,
  };
}

describe("assignable admin roles", () => {
  it("permits exactly the three admin tiers", () => {
    expect([...ASSIGNABLE_ADMIN_ROLES]).toEqual(["MODERATOR", "ADMIN", "SUPER_ADMIN"]);
  });

  it("refuses customer and owner roles", () => {
    // Ownership is a consequence of creating an organization, not an assignable
    // privilege. Allowing it would let an admin hand themselves a tenant.
    expect(isAssignableAdminRole("CUSTOMER")).toBe(false);
    expect(isAssignableAdminRole("ORGANIZATION_OWNER")).toBe(false);
  });

  it("refuses untrusted input without throwing", () => {
    expect(isAssignableAdminRole(undefined)).toBe(false);
    expect(isAssignableAdminRole(null)).toBe(false);
    expect(isAssignableAdminRole("super_admin")).toBe(false);
    expect(isAssignableAdminRole(1)).toBe(false);
  });
});

describe("requireSuperAdmin", () => {
  it("admits a Super Admin", () => {
    const superAdmin = actorWithRole("superadmin@asip.dev", "SUPER_ADMIN");
    const result = requireSuperAdmin(asUser(superAdmin));

    expect("user" in result).toBe(true);
  });

  it("refuses a regular Admin", () => {
    // The chosen split is explicit: an Admin manages content, a Super Admin
    // manages accounts. Allowing Admin here would collapse the two tiers.
    const admin = createAdminUser({
      name: "Test Admin",
      email: `test-admin-${crypto.randomUUID()}@asip.dev`,
      password: "Password123!",
      role: "ADMIN",
    });
    const result = requireSuperAdmin(asUser(admin));

    expect("response" in result && result.response.status).toBe(403);
  });

  it("refuses a customer", () => {
    const customer = listUsers({ role: "CUSTOMER" })[0];
    const result = requireSuperAdmin(asUser(customer));

    expect("response" in result && result.response.status).toBe(403);
  });

  it("still refuses an unauthenticated request with 401", () => {
    const result = requireSuperAdmin(new NextRequest("http://localhost/api/v1/admin/users/"));

    expect("response" in result && result.response.status).toBe(401);
  });

  it("refuses a refresh token presented as a bearer credential", () => {
    const superAdmin = actorWithRole("superadmin@asip.dev", "SUPER_ADMIN");
    const request = new NextRequest("http://localhost/api/v1/admin/users/");
    request.headers.set(
      "authorization",
      `Bearer ${issueTokens(superAdmin).refresh_token}`,
    );
    const result = requireSuperAdmin(request);

    expect("response" in result && result.response.status).toBe(401);
  });
});

describe("requireRole for admin content", () => {
  it("admits both admin tiers, so the admin area is not Super Admin-only", () => {
    const admin = createAdminUser({
      name: "Content Admin",
      email: `content-admin-${crypto.randomUUID()}@asip.dev`,
      password: "Password123!",
      role: "ADMIN",
    });
    const result = requireRole(asUser(admin), ["ADMIN", "SUPER_ADMIN"]);

    expect("user" in result).toBe(true);
  });

  it("refuses a customer", () => {
    const customer = listUsers({ role: "CUSTOMER" })[0];
    const result = requireRole(asUser(customer), ["ADMIN", "SUPER_ADMIN"]);

    expect("response" in result && result.response.status).toBe(403);
  });
});

describe("guardSelfTarget", () => {
  it("refuses an admin changing their own role or status", () => {
    const superAdmin = actorWithRole("superadmin@asip.dev", "SUPER_ADMIN");

    expect(guardSelfTarget(superAdmin, superAdmin)).not.toBeNull();
  });

  it("permits an admin changing another account", () => {
    const superAdmin = actorWithRole("superadmin@asip.dev", "SUPER_ADMIN");
    const other = createAdminUser({
      name: "Another Admin",
      email: `another-${crypto.randomUUID()}@asip.dev`,
      password: "Password123!",
      role: "ADMIN",
    });

    expect(guardSelfTarget(superAdmin, other)).toBeNull();
  });
});

describe("toPublicUser", () => {
  it("never exposes the password hash", () => {
    const admin = createAdminUser({
      name: "Secret Admin",
      email: `secret-${crypto.randomUUID()}@asip.dev`,
      password: "Password123!",
      role: "ADMIN",
    });

    // A leak here would put every admin credential in the browser payload.
    expect(JSON.stringify(toPublicUser(admin))).not.toContain("Password123!");
  });
});
