import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoginForm } from "./login-form";
import { __resetNavigation, __setSearchParams, routerMock } from "@/test/stubs/next-navigation";

/**
 * Post-sign-in navigation.
 *
 * Two rules are being pinned here:
 *  1. `?next=` returns the visitor to the page that bounced them to login.
 *  2. `?next=` is attacker-controllable and becomes a redirect target, so it is
 *     validated for open redirects and checked against the signed-in role.
 */

const state: { user: { role: string } } = { user: { role: "CUSTOMER" } };

vi.mock("../api/use-auth", () => ({
  useLogin: () => ({
    mutateAsync: vi.fn().mockImplementation(async () => state.user),
    isPending: false,
  }),
}));

async function signIn(email = "user@example.com", password = "Password123!") {
  render(<LoginForm />);
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

beforeEach(() => {
  __resetNavigation();
  state.user = { role: "CUSTOMER" };
});

describe("sign-in destination", () => {
  it("lands a customer on the organization list", async () => {
    await signIn();
    expect(routerMock.push).toHaveBeenCalledWith("/organizations");
  });

  it("lands an admin on the admin area", async () => {
    state.user = { role: "ADMIN" };
    await signIn();
    expect(routerMock.push).toHaveBeenCalledWith("/admin");
  });

  it("returns to the page named by next=", async () => {
    __setSearchParams("next=/search");
    await signIn();
    expect(routerMock.push).toHaveBeenCalledWith("/search");
  });

  it("returns to a nested next= destination with its query string", async () => {
    __setSearchParams("next=/organizations/abc/analytics?tab=reviews");
    await signIn();
    expect(routerMock.push).toHaveBeenCalledWith("/organizations/abc/analytics?tab=reviews");
  });

  it("still prefers next= over the role landing", async () => {
    state.user = { role: "SUPER_ADMIN" };
    __setSearchParams("next=/search");
    await signIn();
    expect(routerMock.push).toHaveBeenCalledWith("/search");
  });
});

describe("next= is not trusted", () => {
  it("ignores a protocol-relative URL and falls back to the role landing", async () => {
    // Without validation this signs the user in, then sends them to another site.
    __setSearchParams("next=//evil.example.com");
    await signIn();
    expect(routerMock.push).toHaveBeenCalledWith("/organizations");
  });

  it("ignores an absolute URL", async () => {
    __setSearchParams("next=https://evil.example.com/steal");
    await signIn();
    expect(routerMock.push).toHaveBeenCalledWith("/organizations");
  });

  it("ignores a javascript: URL", async () => {
    __setSearchParams("next=javascript:alert(1)");
    await signIn();
    expect(routerMock.push).toHaveBeenCalledWith("/organizations");
  });

  it("refuses to send a customer into the admin area", async () => {
    // The proxy redirects every signed-out visitor to login without knowing who
    // they are, so a customer can arrive with next=/admin/users. Following it
    // would land them on a page that renders "Super Admin access required".
    state.user = { role: "CUSTOMER" };
    __setSearchParams("next=/admin/users");
    await signIn();
    expect(routerMock.push).toHaveBeenCalledWith("/organizations");
  });

  it("lets an admin follow next= into the admin area", async () => {
    state.user = { role: "ADMIN" };
    __setSearchParams("next=/admin/users");
    await signIn();
    expect(routerMock.push).toHaveBeenCalledWith("/admin/users");
  });

  it("does not treat a non-admin path as admin-only", async () => {
    // Guards against a prefix check that would also match e.g. /administrators.
    __setSearchParams("next=/administrators");
    await signIn();
    expect(routerMock.push).toHaveBeenCalledWith("/administrators");
  });
});
