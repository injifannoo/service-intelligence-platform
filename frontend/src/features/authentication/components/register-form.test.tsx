import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RegisterForm } from "./register-form";
import { ApiError } from "@/lib/api-client";
import { __resetNavigation, __setSearchParams, routerMock } from "@/test/stubs/next-navigation";

/**
 * Registration signs the new account straight in.
 *
 * The form used to end on a "check your inbox" screen, but the backend has no
 * verification endpoint, sends no mail, and stores no `email_verified` flag — so
 * that screen promised something impossible and left a new user unable to
 * proceed. These tests pin the working behaviour, including the fallback for when
 * registration succeeds but the automatic sign-in does not.
 */

const state = {
  register: vi.fn(),
  login: vi.fn(),
};

vi.mock("../api/use-auth", () => ({
  useRegister: () => ({ mutateAsync: state.register, isPending: false }),
  useLogin: () => ({ mutateAsync: state.login, isPending: false }),
}));

async function submitForm() {
  render(<RegisterForm />);
  await userEvent.type(screen.getByLabelText("Full name"), "Ada Lovelace");
  await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "Password123!");
  await userEvent.click(screen.getByRole("button", { name: /create account/i }));
}

beforeEach(() => {
  __resetNavigation();
  state.register = vi.fn().mockResolvedValue({ message: "Account created" });
  state.login = vi.fn().mockResolvedValue({ role: "CUSTOMER" });
});

describe("registration", () => {
  it(
    "signs the new account in and lands them on the organization list",
    async () => {
      await submitForm();

    expect(state.register).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "Password123!",
    });
    expect(state.login).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "Password123!",
    });
    expect(routerMock.push).toHaveBeenCalledWith("/organizations");
  }, 15000);

  it("never claims the account must be verified by email", async () => {
    await submitForm();

    // The dead end this replaced. No verification endpoint exists to satisfy it.
    expect(screen.queryByText(/check your email/i)).toBeNull();
    expect(screen.queryByText(/verify your email/i)).toBeNull();
  });

  it("honours next= so a bounced visitor returns where they were going", async () => {
    __setSearchParams("next=/search");
    await submitForm();

    expect(routerMock.push).toHaveBeenCalledWith("/search");
  });

  it("honours redirectTo so business signup continues into onboarding", async () => {
    render(<RegisterForm redirectTo="/onboarding/organization" />);
    await userEvent.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(routerMock.push).toHaveBeenCalledWith("/onboarding/organization");
  });

  it("reports a registration failure without attempting to sign in", async () => {
    state.register = vi.fn().mockRejectedValue(
      new ApiError(
        400,
        {
          code: "VALIDATION_ERROR",
          message: "Please correct the highlighted fields.",
          details: { email: ["A user with this email already exists."] },
        },
        "Registration failed",
      ),
    );

    await submitForm();

    expect(state.login).not.toHaveBeenCalled();
    expect(await screen.findByText("A user with this email already exists.")).toBeDefined();
  });

  it("offers sign in when the account exists but the automatic sign-in fails", async () => {
    // Retrying the whole submit here would fail on "email already exists", so
    // the form has to route the user to sign in instead of looping.
    state.login = vi.fn().mockRejectedValue(new Error("network down"));

    await submitForm();

    expect(await screen.findByText("Account created")).toBeDefined();
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /go to sign in/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
