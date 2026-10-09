import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApiError } from "@/lib/api-client";
import type { ModerationReport } from "@/types";

import { AdminModeration, ModerationQueue } from "./admin-moderation";

/**
 * Admin moderation queue.
 *
 * Covers the workflow docs/02:127 requires ("manual abuse reporting queues to
 * catch spam or fraudulent reviews") and the two outcomes docs/02:314-315
 * imply: reports are moderated, and fraudulent reviews are removed.
 */

const state = {
  isAdmin: true,
  isPending: true,
  isError: false,
  error: null as unknown,
  data: [] as ModerationReport[],
  decide: vi.fn(),
  decidePending: false,
};

vi.mock("../api/use-admin", () => ({
  useIsPlatformAdmin: () => state.isAdmin,
  useModerationReports: () => ({
    data: { data: state.data, pagination: null },
    isPending: state.isPending,
    isError: state.isError,
    error: state.error,
  }),
  useDecideModeration: () => ({
    mutateAsync: state.decide,
    isPending: state.decidePending,
  }),
}));

function report(overrides: Partial<ModerationReport> = {}): ModerationReport {
  return {
    review_id: "review-1",
    reason: "SPAM",
    note: "Repeated identical text.",
    reported_at: "2026-01-05T10:00:00.000Z",
    organization_id: "org-1",
    organization_name: "ABC Technology",
    review: {
      id: "review-1",
      user_id: "user-1",
      organization_id: "org-1",
      rating: 1,
      comment: "Buy cheap followers now!!!",
      verified: false,
      created_at: "2026-01-04T10:00:00.000Z",
      author_name: "Ada Lovelace",
    },
    ...overrides,
  };
}

beforeEach(() => {
  state.isAdmin = true;
  state.isPending = false;
  state.isError = false;
  state.error = null;
  state.data = [];
  state.decide = vi.fn().mockResolvedValue(undefined);
  state.decidePending = false;
});

describe("loading and empty states", () => {
  it("shows a skeleton while the queue is loading", () => {
    state.isPending = true;

    const { container } = render(<ModerationQueue enabled />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByText("Nothing to moderate")).toBeNull();
  });

  it("says there is nothing to moderate when no reviews are reported", () => {
    render(<ModerationQueue enabled />);

    expect(screen.getByText("Nothing to moderate")).toBeDefined();
    expect(screen.getByText("No reviews have been reported.")).toBeDefined();
  });

  it("surfaces the API failure rather than an empty queue", () => {
    state.isError = true;
    state.error = new ApiError(
      403,
      { code: "PERMISSION_DENIED", message: "Not allowed" },
      "Not allowed",
    );

    render(<ModerationQueue enabled />);

    // Reporting an error as "nothing to moderate" would hide a real outage.
    expect(screen.queryByText("Nothing to moderate")).toBeNull();
    expect(screen.getByText("Not allowed")).toBeDefined();
  });

  it("withholds the queue until the role is known", () => {
    state.isAdmin = false;

    // `AdminModeration` always renders its heading; it is the queue that must be
    // withheld, because `useModerationReports(false)` is what keeps the
    // admin-only query disabled until `useCurrentUser` has resolved.
    render(<AdminModeration />);

    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByText("Nothing to moderate")).toBeNull();
  });
});

describe("queue contents", () => {
  it("shows the organization, the review, and the reporter's note", () => {
    state.data = [report()];

    render(<ModerationQueue enabled />);

    expect(screen.getByText("ABC Technology")).toBeDefined();
    expect(screen.getByText("Buy cheap followers now!!!")).toBeDefined();
    expect(screen.getByText(/Reported/)).toBeDefined();
    expect(screen.getByText("Reporter note:")).toBeDefined();
    expect(screen.getByText("Repeated identical text.")).toBeDefined();
    expect(screen.getByText("Ada Lovelace")).toBeDefined();
  });

  it("labels a reason outside the known vocabulary without blanking it", () => {
    state.data = [report({ reason: "SOMETHING_ELSE" })];

    render(<ModerationQueue enabled />);

    // A blank badge would look identical to "no reason recorded".
    expect(screen.getByText("SOMETHING_ELSE")).toBeDefined();
  });
});

describe("moderating", () => {
  it("dismisses the report without removing the review", async () => {
    const user = userEvent.setup();
    state.data = [report()];

    render(<ModerationQueue enabled />);
    await user.click(screen.getByRole("button", { name: "Dismiss report" }));

    expect(state.decide).toHaveBeenCalledWith({ id: "review-1", action: "DISMISS" });
  });

  it("removes the review when the report is upheld", async () => {
    const user = userEvent.setup();
    state.data = [report()];

    render(<ModerationQueue enabled />);
    await user.click(screen.getByRole("button", { name: "Remove review" }));

    expect(state.decide).toHaveBeenCalledWith({ id: "review-1", action: "REMOVE" });
  });

  it("disables both actions while a decision is in flight", () => {
    state.decidePending = true;
    state.data = [report()];

    render(<ModerationQueue enabled />);

    expect(screen.getByRole("button", { name: "Dismiss report" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove review" })).toBeDisabled();
  });

  it("reports a failed decision without claiming it resolved", async () => {
    const user = userEvent.setup();
    state.decide = vi.fn().mockRejectedValue(
      new ApiError(
        404,
        { code: "NOT_FOUND", message: "No longer awaiting moderation." },
        "No longer awaiting moderation.",
      ),
    );
    state.data = [report()];

    render(<ModerationQueue enabled />);
    await user.click(screen.getByRole("button", { name: "Dismiss report" }));

    expect(await screen.findByText("No longer awaiting moderation.")).toBeDefined();
    // A row that failed must stay actionable, or the queue is stuck.
    expect(screen.getByRole("button", { name: "Dismiss report" })).toBeEnabled();
  });

  it("marks the row resolved once the decision succeeds", async () => {
    const user = userEvent.setup();
    state.data = [report()];

    render(<ModerationQueue enabled />);
    await user.click(screen.getByRole("button", { name: "Remove review" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Resolved" })).toBeDefined();
    });
  });
});
