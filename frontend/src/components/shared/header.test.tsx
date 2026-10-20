import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act, type ReactElement } from "react";

import { Header } from "./header";
import { ROUTES } from "@/config/site-config";
import { routerMock, __resetNavigation } from "@/test/stubs/next-navigation";

/**
 * Application shell header.
 *
 * The session lives in a cookie, so the server never sees one: it renders the
 * account pane empty and the client renders it populated. That asymmetry is the
 * same one that broke the homepage, so the assertions here are mostly about
 * which tree each side produces rather than about the nav itself.
 */

const state: {
  /* Stands in for the access token in `document.cookie`, which `useCurrentUser`
   * gates on. Modelled explicitly because the two renders must disagree. */
  cookie: boolean;
  user: { name: string; role: string } | undefined;
  isPending: boolean;
  isFetching: boolean;
  logout: ReturnType<typeof vi.fn>;
} = {
  cookie: false,
  user: undefined,
  isPending: false,
  isFetching: false,
  logout: vi.fn(),
};

vi.mock("@/features/authentication/api/use-auth", () => ({
  useCurrentUser: () => ({
    data: state.cookie ? state.user : undefined,
    isPending: state.isPending,
    isFetching: state.isFetching,
  }),
  useLogout: () => ({ mutateAsync: state.logout, isPending: false, isError: false }),
}));

function signIn(role: string, name = "Ada Lovelace") {
  state.cookie = true;
  state.user = { name, role };
}

beforeEach(() => {
  state.cookie = false;
  state.user = undefined;
  state.isPending = false;
  state.isFetching = false;
  state.logout = vi.fn().mockResolvedValue(undefined);
  __resetNavigation();
});

describe("hydration safety", () => {
  function hydrateAgainstServerHtml(element: ReactElement) {
    state.cookie = false;
    const serverHtml = renderToString(element);
    state.cookie = true;

    // Left detached on purpose: appending these roots would let later `screen`
    // queries match duplicate markup from the hydration tests.
    const container = document.createElement("div");
    container.innerHTML = serverHtml;

    const errors: unknown[][] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args);
    });
    const onRecoverableError = (error: unknown) => {
      errors.push([error]);
    };

    let root: ReturnType<typeof hydrateRoot>;
    act(() => {
      root = hydrateRoot(container, element, { onRecoverableError });
    });

    return {
      container,
      errors,
      spy: consoleError,
      settled: async () => {
        await act(async () => {
          await Promise.resolve();
        });
        root.unmount();
      },
    };
  }

  function hydrationErrors(errors: unknown[][]) {
    const describe = (args: unknown[]) =>
      args
        .map((arg) => (arg instanceof Error ? `${arg.name}: ${arg.message}` : String(arg)))
        .join(" ");

    return errors
      .map(describe)
      .filter((text) => /hydrat|did not match|server rendered html/i.test(text));
  }

  it("hydrates without a mismatch even when a session exists", async () => {
    signIn("CUSTOMER");

    const { errors, spy, settled } = hydrateAgainstServerHtml(<Header />);
    await settled();

    expect(hydrationErrors(errors)).toEqual([]);
    spy.mockRestore();
  });

  it("leaves the account pane empty in the server HTML", () => {
    // The server has no cookie, so it cannot know the visitor is signed in.
    // Emitting the account menu here is what made React discard the tree.
    signIn("CUSTOMER");
    state.cookie = false;

    const html = renderToString(<Header />);

    expect(html).not.toContain("Ada Lovelace");
    expect(html).not.toContain("Sign out");
    // The nav itself is identical on both sides and must still be prerendered.
    expect(html).toContain("Organizations");
  });

  it("reveals the account menu once hydration has completed", async () => {
    signIn("CUSTOMER");

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeDefined();
    });
    expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
  });
});

describe("reserving space", () => {
  /*
   * A disabled query reports status "pending" with fetchStatus "idle" forever, so
   * gating on `isPending` alone would park every visitor on a skeleton. Space is
   * reserved only while a request is genuinely in flight.
   */
  it("does not reserve space for a visitor with no session", () => {
    state.cookie = false;
    state.isPending = true;
    state.isFetching = false;

    const { container } = render(<Header />);

    expect(container.querySelector(".animate-pulse")).toBeNull();
  });

  it("reserves space while the session is being resolved", () => {
    signIn("CUSTOMER");
    state.user = undefined;
    state.isPending = true;
    state.isFetching = true;

    const { container } = render(<Header />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
  });

  it("shows the session request fail loudly rather than as an empty header", () => {
    // No account menu and no skeleton once the request has settled with nothing.
    state.cookie = false;
    state.isPending = false;
    state.isFetching = false;

    const { container } = render(<Header />);

    expect(container.querySelector(".animate-pulse")).toBeNull();
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
  });
});

describe("guest browsing", () => {
  it("offers sign-in and sign-up to a visitor with no session", () => {
    state.cookie = false;

    render(<Header />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      ROUTES.login,
    );
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute(
      "href",
      ROUTES.register,
    );
  });

  it("does not offer the guest CTAs while a session is still unresolved", () => {
    signIn("CUSTOMER");
    state.user = undefined;
    state.isFetching = true;

    render(<Header />);

    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });
});

describe("signing out", () => {
  it("routes to the sign-in page after logout succeeds", async () => {
    const user = userEvent.setup();
    signIn("CUSTOMER");

    render(<Header />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
    });

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(state.logout).toHaveBeenCalledOnce();
    // `handleLogout` awaits the mutation before navigating, so the push lands on
    // a later tick.
    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith(ROUTES.login);
    });
  });
});
