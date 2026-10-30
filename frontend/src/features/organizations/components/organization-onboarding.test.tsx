import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OrganizationOnboarding } from "./organization-onboarding";
import { ApiError } from "@/lib/api-client";
import { __resetNavigation, routerMock } from "@/test/stubs/next-navigation";

/**
 * Step 2 of business onboarding (docs/09:256-278).
 *
 * The form has one job: turn a signed-in account into an organization owner and
 * open the new profile, which carries the pending-verification badge and the
 * claim form. These tests pin the payload, the destination, the inline error
 * path, and the guard that stops an existing owner creating a second tenant.
 */

const state: {
  create: ReturnType<typeof vi.fn>;
  isPending: boolean;
  user: { organization_id: string | null } | undefined;
} = {
  create: vi.fn(),
  isPending: false,
  user: { organization_id: null },
};

vi.mock("@/features/authentication/api/use-auth", () => ({
  useCurrentUser: () => ({ data: state.user }),
}));

vi.mock("@/features/organizations/api/use-organization", () => ({
  useCreateOrganization: () => ({
    mutateAsync: state.create,
    isPending: state.isPending,
  }),
}));

beforeEach(() => {
  __resetNavigation();
  state.create = vi.fn().mockResolvedValue({ id: "org-123" });
  state.isPending = false;
  state.user = { organization_id: null };
});

describe("business onboarding", () => {
  it("creates the organization and opens its profile", async () => {
    render(<OrganizationOnboarding />);
    await userEvent.type(screen.getByLabelText("Business name"), "Acme");

    await userEvent.click(
      screen.getByRole("button", { name: /create business profile/i }),
    );

    expect(state.create).toHaveBeenCalledWith({
      name: "Acme",
      industry: "Software",
      description: undefined,
      location: undefined,
      phone: undefined,
      website: undefined,
    });
    expect(routerMock.push).toHaveBeenCalledWith("/organizations/org-123");
  });

  it("reports a server field error without navigating away", async () => {
    state.create = vi.fn().mockRejectedValue(
      new ApiError(
        400,
        {
          code: "VALIDATION_ERROR",
          message: "Please correct the highlighted fields.",
          details: { name: ["This field is required."] },
        },
        "failed",
      ),
    );

    render(<OrganizationOnboarding />);
    await userEvent.type(screen.getByLabelText("Business name"), "Acme");
    await userEvent.click(
      screen.getByRole("button", { name: /create business profile/i }),
    );

    expect(await screen.findByText("This field is required.")).toBeDefined();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("sends an existing owner to their organization instead of a second form", () => {
    state.user = { organization_id: "org-existing" };

    render(<OrganizationOnboarding />);

    expect(routerMock.replace).toHaveBeenCalledWith("/organizations/org-existing");
  });
});
