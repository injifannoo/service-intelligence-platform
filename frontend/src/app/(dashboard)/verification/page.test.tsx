import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import VerificationRedirectPage from "./page";
import { ROUTES } from "@/config/site-config";
import { routerMock, __resetNavigation } from "@/test/stubs/next-navigation";

/**
 * The legacy `/verification` path now forwards to where verification lives.
 *
 * Admins belong on the admin queue; everyone else must not be dropped on the
 * admin shell's "Not permitted" screen, so they go to their dashboard.
 */

const state: {
  user: { role: string } | undefined;
  isPending: boolean;
  isError: boolean;
} = { user: undefined, isPending: false, isError: false };

vi.mock("@/features/authentication/api/use-auth", () => ({
  useCurrentUser: () => ({
    data: state.user,
    isPending: state.isPending,
    isError: state.isError,
  }),
}));

beforeEach(() => {
  state.user = undefined;
  state.isPending = false;
  state.isError = false;
  __resetNavigation();
});

describe("verification legacy redirect", () => {
  it("sends an admin to the admin verification queue", () => {
    state.user = { role: "ADMIN" };
    render(<VerificationRedirectPage />);

    expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.adminVerification);
  });

  it("sends a super admin to the admin verification queue", () => {
    state.user = { role: "SUPER_ADMIN" };
    render(<VerificationRedirectPage />);

    expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.adminVerification);
  });

  it("sends a customer to their dashboard instead of the admin area", () => {
    state.user = { role: "CUSTOMER" };
    render(<VerificationRedirectPage />);

    expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.organizations);
  });

  it("waits for the profile request before redirecting", () => {
    state.isPending = true;
    render(<VerificationRedirectPage />);

    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("never sends a signed-out visitor into the admin area", () => {
    state.isError = true;
    render(<VerificationRedirectPage />);

    expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.organizations);
  });
});
