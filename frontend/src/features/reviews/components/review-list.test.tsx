import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api-client";
import type { OrganizationReview, UserProfile } from "@/types";

import { ReviewList } from "./review-list";

/**
 * The review list, including editing and deleting a review.
 *
 * These two verbs are docs/02:181-182 ("Edit review", "Delete review"). The
 * things worth locking in are that they reach only the author — everyone else
 * gets the report action, because docs/02:314 makes moderation a queue — that a
 * delete asks first, and that a failed edit or delete stays on screen instead
 * of pretending the change landed.
 */

const state = {
  currentUser: { id: "user-1" } as UserProfile | null,
  reviews: [] as OrganizationReview[],
  isPending: false,
  isError: false,
  error: null as unknown,
  update: vi.fn(),
  updatePending: false,
  remove: vi.fn(),
  removePending: false,
  report: vi.fn(),
};

vi.mock("../api/use-reviews", () => ({
  useOrganizationReviews: () => ({
    data: state.reviews,
    isPending: state.isPending,
    isError: state.isError,
    error: state.error,
  }),
  useReportReview: () => ({ mutateAsync: state.report, isPending: false }),
  useUpdateReview: () => ({
    mutateAsync: state.update,
    isPending: state.updatePending,
  }),
  useDeleteReview: () => ({
    mutateAsync: state.remove,
    isPending: state.removePending,
  }),
}));

vi.mock("@/features/authentication", () => ({
  useCurrentUser: () => ({ data: state.currentUser }),
}));

function review(overrides: Partial<OrganizationReview> = {}): OrganizationReview {
  return {
    id: "review-1",
    user_id: "user-1",
    organization_id: "org-1",
    rating: 4,
    comment: "Solid work.",
    verified: false,
    created_at: "2026-01-04T10:00:00.000Z",
    author_name: "Ada Lovelace",
    ...overrides,
  };
}

beforeEach(() => {
  state.currentUser = { id: "user-1" } as UserProfile;
  state.reviews = [review()];
  state.isPending = false;
  state.isError = false;
  state.error = null;
  state.update = vi.fn().mockResolvedValue(undefined);
  state.updatePending = false;
  state.remove = vi.fn().mockResolvedValue(undefined);
  state.removePending = false;
  state.report = vi.fn().mockResolvedValue(undefined);
});

describe("rendering", () => {
  it("shows a skeleton while the reviews are loading", () => {
    state.isPending = true;

    const { container } = render(<ReviewList organizationId="org-1" />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByText("No reviews yet")).toBeNull();
  });

  it("encourages a first review rather than showing an empty list", () => {
    state.reviews = [];

    render(<ReviewList organizationId="org-1" />);

    expect(screen.getByText("No reviews yet")).toBeDefined();
  });

  it("surfaces the API failure rather than reporting no reviews", () => {
    state.isError = true;
    state.error = new ApiError(
      500,
      { code: "SERVER_ERROR", message: "Reviews are unavailable." },
      "Reviews are unavailable.",
    );

    render(<ReviewList organizationId="org-1" />);

    expect(screen.queryByText("No reviews yet")).toBeNull();
    expect(screen.getByText("Reviews are unavailable.")).toBeDefined();
  });
});

describe("who can edit or delete", () => {
  it("offers Edit and Delete to the author of a review", () => {
    render(<ReviewList organizationId="org-1" />);

    expect(screen.getByRole("button", { name: "Edit" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Report" })).toBeNull();
  });

  it("offers only Report on someone else's review", () => {
    state.reviews = [review({ user_id: "someone-else" })];

    render(<ReviewList organizationId="org-1" />);

    expect(screen.getByRole("button", { name: "Report" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("offers only Report to a visitor who is not signed in", () => {
    state.currentUser = null;

    render(<ReviewList organizationId="org-1" />);

    expect(screen.getByRole("button", { name: "Report" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });
});

describe("editing", () => {
  it("opens the editor pre-filled with the review as it stands", async () => {
    const user = userEvent.setup();

    render(<ReviewList organizationId="org-1" />);
    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("radio", { name: "4 out of 5" })).toBeChecked();
    expect(screen.getByLabelText("Comment")).toHaveValue("Solid work.");
  });

  it("saves the new rating and comment", async () => {
    const user = userEvent.setup();

    render(<ReviewList organizationId="org-1" />);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("radio", { name: "2 out of 5" }));
    await user.clear(screen.getByLabelText("Comment"));
    await user.type(screen.getByLabelText("Comment"), "Changed my mind.");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(state.update).toHaveBeenCalledWith({
        id: "review-1",
        rating: 2,
        comment: "Changed my mind.",
      });
    });
  });

  it("keeps the editor open and reports why a save failed", async () => {
    const user = userEvent.setup();
    state.update = vi.fn().mockRejectedValue(
      new ApiError(
        403,
        { code: "PERMISSION_DENIED", message: "You can only change your own review." },
        "You can only change your own review.",
      ),
    );

    render(<ReviewList organizationId="org-1" />);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("You can only change your own review."),
    ).toBeDefined();
    // The edit button must still be there, or the author is locked out of the
    // review they still own.
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("abandons the edit without calling the API when Cancel is pressed", async () => {
    const user = userEvent.setup();

    render(<ReviewList organizationId="org-1" />);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(state.update).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Comment")).toBeNull();
  });
});

describe("deleting", () => {
  it("confirms before touching the API", async () => {
    const user = userEvent.setup();

    render(<ReviewList organizationId="org-1" />);
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText("Delete this review?")).toBeDefined();
    expect(state.remove).not.toHaveBeenCalled();
  });

  it("deletes once the author confirms", async () => {
    const user = userEvent.setup();

    render(<ReviewList organizationId="org-1" />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete review" }));

    await waitFor(() => {
      expect(state.remove).toHaveBeenCalledWith({ id: "review-1" });
    });
  });

  it("keeps the dialog open and reports why a delete failed", async () => {
    const user = userEvent.setup();
    state.remove = vi.fn().mockRejectedValue(
      new ApiError(
        404,
        { code: "NOT_FOUND", message: "Review not found." },
        "Review not found.",
      ),
    );

    render(<ReviewList organizationId="org-1" />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete review" }));

    expect(await screen.findByText("Review not found.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Delete review" })).toBeEnabled();
  });

  it("cancels a pending delete without calling the API", async () => {
    const user = userEvent.setup();

    render(<ReviewList organizationId="org-1" />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(state.remove).not.toHaveBeenCalled();
    expect(screen.queryByText("Delete this review?")).toBeNull();
  });
});
