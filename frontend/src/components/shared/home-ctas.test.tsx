import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act, type ReactElement } from "react";

import { ClosingCtaCopy, ClosingPrimaryCta } from "./closing-cta";
import { HeroSecondaryCta } from "./hero-secondary-cta";
import { HomeHeaderActions } from "./home-header-actions";

/**
 * Homepage call-to-action rendering.
 *
 * The CTAs are links to the dedicated `/login` and `/register` pages, so the
 * assertions here are about which href each acquisition prompt targets rather
 * than about a modal.
 */

const state: {
  /*
   * `cookie` stands in for the access token in `document.cookie`, which is what
   * the real `useCurrentUser` gates on. It is modelled explicitly because the
   * server render and the client render must see *different* values — that
   * asymmetry is the entire cause of the hydration bug — and both happen in the
   * same process here.
   */
  cookie: boolean;
  user: { name: string; email: string; role: string } | undefined;
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
  useLogout: () => ({ mutateAsync: state.logout, isPending: false }),
}));

/** Renders a CTA on its own, as the real pages do. */
function renderCta(cta: ReactElement) {
  return render(cta);
}

/** Simulates a visitor who already has a session cookie. */
function signIn(role: string, name = "Ada Lovelace") {
  state.cookie = true;
  state.user = { name, email: "ada@example.com", role };
}

beforeEach(() => {
  state.cookie = false;
  state.user = undefined;
  state.isPending = false;
  state.isFetching = false;
  state.logout = vi.fn().mockResolvedValue(undefined);
});

describe("hydration safety", () => {
  /*
   * Regression: the access token lives in a cookie the server never sees, so the
   * server always renders the signed-out variants. Rendering the signed-in variant
   * during hydration made React discard the whole tree.
   *
   * These use `hydrateRoot` against real server HTML rather than `render`. That
   * distinction is the whole point: on a fresh client mount `useSyncExternalStore`
   * reads `getSnapshot` and immediately reports "hydrated", so a plain `render`
   * would pass even with the bug in place. Only hydration consults
   * `getServerSnapshot`, which is what `useHydrated` relies on.
   *
   * React reports hydration mismatches through `console.error`, so asserting that
   * it stays silent is a direct check of the failure the user hit.
   */
  function hydrateAgainstServerHtml(element: ReactElement) {
    /*
     * The server render happens with no session cookie visible, exactly as in
     * production; the cookie is then "sent" so the client render sees the session
     * the visitor actually has. Without this the two renders would agree trivially
     * and the test would prove nothing.
     */
    state.cookie = false;
    const serverHtml = renderToString(element);
    state.cookie = true;

    /*
     * Deliberately not appended to `document.body`. `hydrateRoot` works against a
     * detached container, and leaving these roots in the document would make
     * later `screen` queries in this file match duplicate markup from the
     * hydration tests.
     */
    const container = document.createElement("div");
    container.innerHTML = serverHtml;

    const errors: unknown[][] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args);
    });
    /*
     * React 19 also reports hydration failures through an uncaught `Error` on the
     * root's error boundary rather than only `console.error`. Without this the
     * failure shows up as an unhandled rejection attributed to whichever test
     * happens to be running, which is misleading. Routing it through the same
     * recorder keeps the finding attached to the assertion that checks it.
     */
    const onRecoverableError = (error: unknown) => {
      errors.push([error]);
    };

    /*
     * Not unmounted here. Tearing a root down in the same tick as `hydrateRoot`
     * produces React's "this root received an early update, before anything was
     * able to hydrate", which is noise from the harness rather than a finding
     * about the component. The root is left mounted and collected with the
     * document body at the end of the test file's lifetime.
     */
    /*
     * `hydrateRoot` is asynchronous: it diffs the existing markup on a later tick.
     * The caller has to await `settled()` before reading `errors`, otherwise the
     * assertion runs before React has looked at the markup and passes vacuously.
     */
    let root: ReturnType<typeof hydrateRoot>;
    act(() => {
      root = hydrateRoot(container, element, {
        onRecoverableError,
      });
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

  /** React reports hydration problems through `console.error`; this is that channel. */
  function hydrationErrors(errors: unknown[][]) {
    const describe = (args: unknown[]) =>
      args
        .map((arg) =>
          arg instanceof Error ? `${arg.name}: ${arg.message}` : String(arg),
        )
        .join(" ");

    return errors
      .map(describe)
      .filter((text) => /hydrat|did not match|server rendered html/i.test(text));
  }

  it("hydrates the header without a mismatch even when a session exists", async () => {
    signIn("CUSTOMER");

    const { errors, spy, settled } = hydrateAgainstServerHtml(<HomeHeaderActions />);
    await settled();

    expect(hydrationErrors(errors)).toEqual([]);
    spy.mockRestore();
  });

  it("hydrates the hero and closing CTAs without a mismatch", async () => {
    signIn("CUSTOMER");

    for (const element of [
      <HeroSecondaryCta key="hero" />,
      <ClosingPrimaryCta key="closing" />,
      <ClosingCtaCopy key="copy" />,
    ]) {
      const { errors, spy, settled } = hydrateAgainstServerHtml(element);
      await settled();

      expect(hydrationErrors(errors)).toEqual([]);
      spy.mockRestore();
    }
  });

  it("emits the public CTAs in the server HTML, never the signed-in menu", () => {
    // The server cannot see the cookie, so it must always produce the signed-out
    // markup. That is also what the first client render produces, which is what
    // makes hydration agree — and it keeps the sign-in links in the static HTML.
    signIn("CUSTOMER");
    state.cookie = false;

    const headerHtml = renderToString(<HomeHeaderActions />);
    expect(headerHtml).toContain("Sign in");
    expect(headerHtml).toContain("Get started");
    expect(headerHtml).toContain('href="/login"');
    expect(headerHtml).toContain('href="/register"');
    expect(headerHtml).not.toContain("Sign out");
    expect(headerHtml).not.toContain("Ada");

    const heroHtml = renderToString(<HeroSecondaryCta />);
    expect(heroHtml).toContain("Register a business");
    expect(heroHtml).toContain('href="/register"');
    expect(heroHtml).not.toContain("/organizations");

    const closingHtml = renderToString(<ClosingPrimaryCta />);
    expect(closingHtml).toContain("Create your account");
    expect(closingHtml).toContain('href="/register"');
  });

  it("reveals the session once hydration has completed", async () => {
    // The point of the gate: the session does become visible, just not during the
    // render that has to agree with the server.
    signIn("CUSTOMER");
    renderCta(<HomeHeaderActions />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
    });
    expect(screen.getByRole("link", { name: /Dashboard/i })).toHaveAttribute(
      "href",
      "/organizations",
    );
  });
});

describe("HomeHeaderActions", () => {
  it("links the header CTA to the dedicated login page", () => {
    renderCta(<HomeHeaderActions />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("links Get started to the dedicated register page", () => {
    renderCta(<HomeHeaderActions />);

    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("renders the acquisition CTAs as real navigation, not modal triggers", () => {
    renderCta(<HomeHeaderActions />);

    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Get started" })).toBeNull();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Get started" })).toBeDefined();
  });

  it("hides both acquisition CTAs once signed in", () => {
    signIn("CUSTOMER");
    renderCta(<HomeHeaderActions />);

    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Get started" })).toBeNull();
    expect(screen.getByRole("link", { name: /Dashboard/i })).toHaveAttribute(
      "href",
      "/organizations",
    );
  });

  it("sends an admin to the admin area and adds the admin shortcut", () => {
    signIn("ADMIN", "Grace Hopper");
    renderCta(<HomeHeaderActions />);

    expect(screen.getByRole("link", { name: /Admin area/i })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: /Dashboard/i })).toHaveAttribute("href", "/admin");
  });

  it("sends a super admin to the admin area", () => {
    signIn("SUPER_ADMIN", "Super");
    renderCta(<HomeHeaderActions />);

    expect(screen.getByRole("link", { name: /Dashboard/i })).toHaveAttribute("href", "/admin");
  });

  it("does not show the admin shortcut to a customer", () => {
    signIn("ORGANIZATION_OWNER", "Cust");
    renderCta(<HomeHeaderActions />);

    expect(screen.queryByRole("link", { name: /Admin area/i })).toBeNull();
  });

  it("reserves space while an existing session is being resolved", () => {
    // A signed-in visitor reloading the page: the profile request is in flight,
    // so rendering "Sign in" now would visibly flicker into the account menu.
    signIn("CUSTOMER");
    state.isPending = true;
    state.isFetching = true;
    const { container } = renderCta(<HomeHeaderActions />);

    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("shows the CTAs to a signed-out visitor instead of parking on a skeleton", () => {
    /*
     * `useCurrentUser` is disabled with no token, so React Query reports status
     * "pending" with fetchStatus "idle" — forever. Gating the skeleton on
     * `isPending` alone hid both CTAs from every signed-out visitor.
     */
    state.isPending = true;
    state.isFetching = false;
    const { container } = renderCta(<HomeHeaderActions />);

    expect(screen.getByRole("link", { name: "Sign in" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Get started" })).toBeDefined();
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });

  it("exposes sign out as a labelled control", () => {
    signIn("CUSTOMER");
    renderCta(<HomeHeaderActions />);

    expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
  });
});

describe("HeroSecondaryCta", () => {
  it("points a signed-out visitor at the dedicated register page", () => {
    renderCta(<HeroSecondaryCta />);

    expect(screen.getByRole("link", { name: /Register a business/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("points a signed-in visitor at their organizations instead", () => {
    signIn("CUSTOMER");
    renderCta(<HeroSecondaryCta />);

    expect(screen.queryByRole("link", { name: /Register a business/i })).toBeNull();
    expect(screen.getByRole("link", { name: /Your organizations/i })).toHaveAttribute(
      "href",
      "/organizations",
    );
  });
});

describe("ClosingPrimaryCta", () => {
  it("points a signed-out visitor at the dedicated register page", () => {
    renderCta(<ClosingPrimaryCta />);

    expect(screen.getByRole("link", { name: /Create your account/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("does not tell a signed-in visitor to create an account again", () => {
    signIn("CUSTOMER");
    renderCta(<ClosingPrimaryCta />);

    expect(screen.queryByRole("link", { name: /Create your account/i })).toBeNull();
    expect(screen.getByRole("link", { name: /Go to your dashboard/i })).toHaveAttribute(
      "href",
      "/organizations",
    );
  });

  it("sends a signed-in admin to the admin area", () => {
    signIn("SUPER_ADMIN", "Grace");
    renderCta(<ClosingPrimaryCta />);

    expect(screen.getByRole("link", { name: /Go to your dashboard/i })).toHaveAttribute(
      "href",
      "/admin",
    );
  });
});

describe("ClosingCtaCopy", () => {
  it("asks a signed-out visitor to sign up", () => {
    renderCta(<ClosingCtaCopy />);
    expect(screen.getByText(/Create an account to save your shortlist/i)).toBeDefined();
  });

  it("does not pitch account creation to an existing account", () => {
    signIn("CUSTOMER");
    renderCta(<ClosingCtaCopy />);

    expect(screen.queryByText(/Create an account to save your shortlist/i)).toBeNull();
  });
});