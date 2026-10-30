import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReviewSummaryCard } from "./review-summary-card";

/**
 * The card renders the whole async task lifecycle: idle, queued/running, settled,
 * and failed. Each of those is a distinct branch in the component, and none of
 * them is covered by the BFF smoke suite, which only exercises the endpoint.
 */

interface TaskStub {
  data:
    | { status: string; result: { summary: string; sentiment_score: number; strengths: string[]; weaknesses: string[] } | null }
    | undefined;
}

const state = {
  request: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
  task: { data: undefined } as TaskStub,
};

vi.mock("../api/use-organization", () => ({
  useRequestAiReviewSummary: () => state.request,
  useAiReviewSummaryTask: () => state.task,
}));

const summaryPayload = {
  summary: "Clients praise responsiveness but flag slow onboarding.",
  sentiment_score: 0.62,
  strengths: ["Fast responses"],
  weaknesses: ["Slow onboarding"],
};

beforeEach(() => {
  state.request = { mutate: vi.fn(), isPending: false, isError: false, error: null };
  state.task = { data: undefined };
});

describe("ReviewSummaryCard idle state", () => {
  it("tells the visitor no summary exists yet", () => {
    render(<ReviewSummaryCard organizationId="org-1" />);
    expect(screen.getByText("No summary generated yet for this organization.")).toBeInTheDocument();
  });

  it("offers generation without spending a model call on page view", () => {
    render(<ReviewSummaryCard organizationId="org-1" />);
    expect(state.request.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /generate summary/i })).toBeEnabled();
  });

  it("requests a summary for the right organization on click", async () => {
    const user = userEvent.setup();
    render(<ReviewSummaryCard organizationId="org-42" />);

    await user.click(screen.getByRole("button", { name: /generate summary/i }));
    expect(state.request.mutate).toHaveBeenCalledWith("org-42", expect.any(Object));
  });
});

describe("ReviewSummaryCard running state", () => {
  it("announces progress to assistive technology while the request is in flight", () => {
    state.request.isPending = true;
    render(<ReviewSummaryCard organizationId="org-1" />);

    expect(screen.getByRole("status")).toHaveTextContent("Generating the review summary.");
    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();
  });

  it("treats a queued task as still running", () => {
    state.task.data = { status: "PENDING", result: null };
    render(<ReviewSummaryCard organizationId="org-1" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();
  });

  it("keeps a settled summary visible if a regeneration is in flight", () => {
    state.request.isPending = true;
    state.task.data = { status: "SUCCESS", result: summaryPayload };
    render(<ReviewSummaryCard organizationId="org-1" />);

    expect(screen.getByText(summaryPayload.summary)).toBeInTheDocument();
  });
});

describe("ReviewSummaryCard settled state", () => {
  beforeEach(() => {
    state.task.data = { status: "SUCCESS", result: summaryPayload };
  });

  it("renders the summary text, sentiment, strengths and weaknesses", () => {
    render(<ReviewSummaryCard organizationId="org-1" />);

    expect(screen.getByText(summaryPayload.summary)).toBeInTheDocument();
    expect(screen.getByText("Sentiment 62% positive")).toBeInTheDocument();
    expect(screen.getByText("Fast responses")).toBeInTheDocument();
    expect(screen.getByText("Slow onboarding")).toBeInTheDocument();
  });

  it("labels the provenance of the summary", () => {
    render(<ReviewSummaryCard organizationId="org-1" />);
    expect(screen.getByText("Derived from on-file reviews")).toBeInTheDocument();
  });

  it("switches to regenerate once a summary exists", () => {
    render(<ReviewSummaryCard organizationId="org-1" />);
    expect(screen.getByRole("button", { name: /regenerate/i })).toBeEnabled();
  });

  it("omits sentiment when the score is absent", () => {
    state.task.data = {
      status: "SUCCESS",
      result: { ...summaryPayload, sentiment_score: null as unknown as number },
    };
    render(<ReviewSummaryCard organizationId="org-1" />);

    expect(screen.queryByText(/sentiment .* positive/i)).not.toBeInTheDocument();
  });

  it("omits an insight section when the list is empty", () => {
    state.task.data = {
      status: "SUCCESS",
      result: { ...summaryPayload, strengths: [], weaknesses: [] },
    };
    render(<ReviewSummaryCard organizationId="org-1" />);

    expect(screen.queryByRole("heading", { name: "Strengths" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Weaknesses" })).not.toBeInTheDocument();
  });
});

describe("ReviewSummaryCard failure state", () => {
  it("surfaces the request error message", () => {
    state.request.isError = true;
    state.request.error = new Error("Not allowed for this organization");
    render(<ReviewSummaryCard organizationId="org-1" />);

    expect(screen.getByText("Not allowed for this organization")).toBeInTheDocument();
  });

  it("distinguishes a failed job from a failed request", () => {
    state.task.data = { status: "FAILURE", result: null };
    render(<ReviewSummaryCard organizationId="org-1" />);

    expect(screen.getByText("The summary job did not complete. Try again.")).toBeInTheDocument();
  });

  it("allows a retry after a failure", () => {
    state.task.data = { status: "FAILURE", result: null };
    render(<ReviewSummaryCard organizationId="org-1" />);

    expect(screen.getByRole("button", { name: /generate summary/i })).toBeEnabled();
  });
});
