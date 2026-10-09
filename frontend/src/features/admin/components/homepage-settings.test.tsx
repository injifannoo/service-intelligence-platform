import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api-client";
import { HOMEPAGE_SECTIONS } from "@/types";
import type { HomepageSectionKey, HomepageSettings, UserProfile } from "@/types";

import { AdminHomepageSettings } from "./homepage-settings";

/**
 * Admin homepage settings.
 *
 * Covers the Super Admin gate (docs/02:96-104: Super Admin manages platform
 * configuration), the section list, and the save workflow.
 */

const defaultSections = Object.fromEntries(
  HOMEPAGE_SECTIONS.map((key) => [key, true]),
) as Record<HomepageSectionKey, boolean>;

const SECTION_LABELS: Record<HomepageSectionKey, string> = {
  hero: "Hero",
  metrics: "Live metrics",
  categories: "Explore categories",
  howItWorks: "How it works",
  featuredProviders: "Featured providers",
  forBusinesses: "For Businesses",
  whyChoose: "Why choose ASIP",
  finalCta: "Final call-to-action",
};

const state = {
  currentUser: { role: "SUPER_ADMIN" } as UserProfile | undefined,
  isPending: false,
  isError: false,
  error: null as unknown,
  data: { sections: { ...defaultSections } } as HomepageSettings,
  save: vi.fn(),
  savePending: false,
};

vi.mock("../api/use-admin", () => ({
  useHomepageSettings: () => ({
    data: state.data,
    isPending: state.isPending,
    isError: state.isError,
    error: state.error,
  }),
  useUpdateHomepageSettings: () => ({
    mutateAsync: state.save,
    isPending: state.savePending,
  }),
}));

vi.mock("@/features/authentication", () => ({
  useCurrentUser: () => ({ data: state.currentUser }),
}));

beforeEach(() => {
  state.currentUser = { role: "SUPER_ADMIN" } as UserProfile;
  state.isPending = false;
  state.isError = false;
  state.error = null;
  state.data = { sections: { ...defaultSections } };
  state.save = vi.fn().mockResolvedValue(undefined);
  state.savePending = false;
});

describe("AdminHomepageSettings", () => {
  it("lists every homepage section", () => {
    render(<AdminHomepageSettings />);

    expect(screen.getByRole("heading", { name: "Homepage sections" })).toBeDefined();
    for (const key of HOMEPAGE_SECTIONS) {
      expect(screen.getByLabelText(SECTION_LABELS[key])).toBeDefined();
    }
  });

  it("is empty for an Admin, since configuration is Super Admin only", () => {
    state.currentUser = { role: "ADMIN" } as UserProfile;

    render(<AdminHomepageSettings />);

    expect(screen.queryByRole("heading", { name: "Homepage sections" })).toBeNull();
  });

  it("sends only the toggled sections on save", async () => {
    const user = userEvent.setup();
    render(<AdminHomepageSettings />);

    await user.click(screen.getByLabelText("Hero"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(state.save).toHaveBeenCalledWith({
        sections: expect.objectContaining({ hero: false }),
      });
    });
    expect(await screen.findByText("Homepage settings saved.")).toBeDefined();
  });

  it("reports a failed save instead of claiming it worked", async () => {
    state.save = vi
      .fn()
      .mockRejectedValue(new ApiError(500, null, "Could not save homepage settings."));
    const user = userEvent.setup();
    render(<AdminHomepageSettings />);

    await user.click(screen.getByLabelText("Final call-to-action"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Could not save homepage settings."),
    ).toBeDefined();
    expect(screen.queryByText("Homepage settings saved.")).toBeNull();
  });
});