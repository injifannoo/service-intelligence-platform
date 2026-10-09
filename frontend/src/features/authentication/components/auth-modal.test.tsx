import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthModalProvider, useAuthModal } from "./auth-modal";
import { ApiError } from "@/lib/api-client";
import { __resetNavigation, routerMock } from "@/test/stubs/next-navigation";

/**
 * The homepage auth modal.
 *
 * It replaced two links that navigated away from the homepage, so the things worth
 * locking in are: the right form appears for the right trigger, switching between
 * them stays on the page, a successful sign-in closes the modal instead of leaving
 * it hanging over the destination, and the modal is dismissible.
 */

const state = {
  login: vi.fn(),
  register: vi.fn(),
  user: undefined as { role: string } | undefined,
};

vi.mock("../api/use-auth", () => ({
  useCurrentUser: () => ({ data: state.user, isPending: false }),
  useLogin: () => ({ mutateAsync: state.login, isPending: false }),
  useRegister: () => ({ mutateAsync: state.register, isPending: false }),
  useLogout: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function Triggers() {
  const { openAuthModal } = useAuthModal();

  return (
    <>
      <button type="button" onClick={() => openAuthModal("signin")}>
        open sign in
      </button>
      <button type="button" onClick={() => openAuthModal("signup")}>
        open sign up
      </button>
    </>
  );
}

function Harness() {
  return (
    <AuthModalProvider>
      <Triggers />
    </AuthModalProvider>
  );
}

async function signInFromModal() {
  render(<Harness />);
  await userEvent.click(screen.getByRole("button", { name: "open sign in" }));
  await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "Password123!");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

beforeEach(() => {
  __resetNavigation();
  state.login = vi.fn().mockResolvedValue({ role: "CUSTOMER" });
  state.register = vi.fn().mockResolvedValue({ message: "Account created" });
  state.user = undefined;
});

describe("opening", () => {
  it("starts closed, so the homepage renders no dialog at all", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the sign-in form with credential fields for signin", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "open sign in" }));

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.queryByLabelText("Full name")).toBeNull();
  });

  it("shows the sign-up form for signup", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "open sign up" }));

    expect(screen.getByLabelText("Full name")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
  });

  it("labels the dialog for screen readers", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "open sign in" }));

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeDefined();
    expect(
      screen.getByText(/sign in to manage your organizations and insights/i),
    ).toBeDefined();
  });
});

describe("switching mode", () => {
  it("moves from sign-in to sign-up without navigating", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "open sign in" }));
    await userEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(screen.getByLabelText("Full name")).toBeDefined();
    // Still the same dialog rather than a route change.
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeDefined();
  });

  it("moves from sign-up back to sign-in", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "open sign up" }));
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeDefined();
    expect(screen.queryByLabelText("Full name")).toBeNull();
  });

  it("discards what was typed so the next form starts empty", async () => {
    // Otherwise a half-filled password silently carries into the signup form.
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "open sign in" }));
    await userEvent.type(screen.getByLabelText("Email"), "leftover@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(screen.getByLabelText("Email")).toHaveValue("");
  });
});

describe("submitting", () => {
  it("navigates and closes on a successful sign in", async () => {
    await signInFromModal();

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith("/organizations");
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the modal open on a failed sign in so the error is readable", async () => {
    state.login = vi.fn().mockRejectedValue(
      new ApiError(401, { code: "INVALID_CREDENTIALS", message: "Invalid credentials." }, "Sign in failed"),
    );

    await signInFromModal();

    expect(await screen.findByText("Invalid credentials.")).toBeDefined();
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("registers, signs in, and closes from the sign-up form", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "open sign up" }));
    await userEvent.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Password123!");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith("/organizations");
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("dismissing", () => {
  it("closes on Escape", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "open sign in" }));
    await userEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("closes on the close button", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "open sign in" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
