import { beforeEach, describe, expect, it } from "vitest";

import {
  createOrganization,
  createUser,
  findUserById,
  resetDevBackend,
} from "@/lib/dev-backend/store";

/**
 * Business self-registration, docs/09_Sprint_Plan.md:256-278.
 *
 * Registering an organization is what makes an account an Organization Owner
 * (docs/04:265, docs/11:456). These tests pin the two halves of that: the new
 * organization is linked to its owner and the owner is promoted, while an
 * account that already holds a higher role is left alone.
 */
describe("organization registration", () => {
  beforeEach(() => {
    resetDevBackend();
  });

  it("links the organization to its owner and promotes a customer", () => {
    const owner = createUser({
      name: "Ada",
      email: "ada@example.com",
      password: "Password123!",
    });
    expect(owner.role).toBe("CUSTOMER");

    const organization = createOrganization({
      name: "Acme",
      industry_id: null,
      ownerId: owner.id,
    });

    const stored = findUserById(owner.id);
    expect(stored?.organization_id).toBe(organization.id);
    expect(stored?.role).toBe("ORGANIZATION_OWNER");
  });

  it("does not demote an admin who creates an organization", () => {
    const admin = createUser({
      name: "Grace",
      email: "grace@example.com",
      password: "Password123!",
      role: "ADMIN",
    });

    createOrganization({ name: "Acme", industry_id: null, ownerId: admin.id });

    expect(findUserById(admin.id)?.role).toBe("ADMIN");
  });

  it("starts a new organization pending verification", () => {
    const owner = createUser({
      name: "Ada",
      email: "ada@example.com",
      password: "Password123!",
    });

    const organization = createOrganization({
      name: "Acme",
      industry_id: null,
      ownerId: owner.id,
    });

    expect(organization.verification_status).toBe("PENDING");
  });
});
