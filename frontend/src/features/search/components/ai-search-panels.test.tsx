import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AiSearchPanels } from "./ai-search-panels";

/**
 * `next/link` resolves to `src/test/stubs/next-link.tsx`. This suite doubles as
 * the regression test for that alias: if the stub stops exporting a default
 * anchor, the `href` assertion below fails at render time.
 */

interface MutationStub {
  mutate: ReturnType<typeof vi.fn>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  data: unknown;
}

const state = {
  semantic: { mutate: vi.fn(), isPending: false, isError: false, error: null, data: undefined } as MutationStub,
  recommend: { mutate: vi.fn(), isPending: false, isError: false, error: null, data: undefined } as MutationStub,
};

/**
 * A single static mock reading from `state`. `vi.doMock` cannot be used for the
 * result cases: the component and its hook module are already in the module
 * registry by then, so a late mock is silently ignored.
 */
vi.mock("@/features/search/api/use-ai-search", () => ({
  useSemanticSearch: () => state.semantic,
  useRecommend: () => state.recommend,
}));

function reset(overrides: { semantic?: Partial<MutationStub>; recommend?: Partial<MutationStub> } = {}) {
  state.semantic = {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides.semantic,
  };
  state.recommend = {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides.recommend,
  };
}

beforeEach(() => reset());

describe("AiSearchPanels layout", () => {
  it("renders both MVP V2 panels", () => {
    render(<AiSearchPanels />);
    expect(screen.getByRole("heading", { name: /semantic search/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /recommendations/i })).toBeInTheDocument();
  });
});

describe("semantic search input", () => {
  it("submits on demand, not per keystroke", async () => {
    const user = userEvent.setup();
    render(<AiSearchPanels />);

    await user.type(screen.getByLabelText(/describe the service you need/i), "cloud hosting");
    expect(state.semantic.mutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^search$/i }));
    expect(state.semantic.mutate).toHaveBeenCalledWith("cloud hosting");
  });

  it("trims the query before sending it", async () => {
    const user = userEvent.setup();
    render(<AiSearchPanels />);

    await user.type(screen.getByLabelText(/describe the service you need/i), "  cloud  ");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(state.semantic.mutate).toHaveBeenCalledWith("cloud");
  });

  it("does not search an empty or whitespace query", async () => {
    const user = userEvent.setup();
    render(<AiSearchPanels />);

    await user.type(screen.getByLabelText(/describe the service you need/i), "   ");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(state.semantic.mutate).not.toHaveBeenCalled();
  });
});

describe("semantic search results", () => {
  const hits = [
    {
      id: "org-1",
      name: "Habesha Cloud Services",
      reason: 'Semantic match on "cloud", "hosting".',
      score: 0.7,
    },
  ];

  it("renders each hit with its reason and match score", () => {
    reset({ semantic: { data: hits } });
    render(<AiSearchPanels />);

    expect(screen.getByText("Habesha Cloud Services")).toBeInTheDocument();
    expect(screen.getByText(/semantic match on/i)).toBeInTheDocument();
    expect(screen.getByText("70% match")).toBeInTheDocument();
  });

  it("links a hit to its profile through the next/link stub", () => {
    reset({ semantic: { data: hits } });
    render(<AiSearchPanels />);

    expect(screen.getByRole("link", { name: /view profile/i })).toHaveAttribute(
      "href",
      "/organizations/org-1",
    );
  });

  it("renders an empty state when nothing matched", () => {
    reset({ semantic: { data: [] } });
    render(<AiSearchPanels />);

    expect(screen.getByText("No semantic matches")).toBeInTheDocument();
  });

  it("surfaces a failure with the server message", () => {
    reset({ semantic: { isError: true, error: new Error("Rate limit reached") } });
    render(<AiSearchPanels />);

    expect(screen.getByText("Rate limit reached")).toBeInTheDocument();
  });

  it("does not render results before a search has been run", () => {
    render(<AiSearchPanels />);
    expect(screen.queryByText("No semantic matches")).not.toBeInTheDocument();
  });
});

describe("recommendations input", () => {
  it("omits optional filters that were left blank", async () => {
    const user = userEvent.setup();
    render(<AiSearchPanels />);

    await user.type(screen.getByLabelText(/category/i), "cloud hosting");
    await user.click(screen.getByRole("button", { name: /get recommendations/i }));

    expect(state.recommend.mutate).toHaveBeenCalledWith({
      category: "cloud hosting",
      budget: undefined,
      location: undefined,
    });
  });

  it("sends the budget and location when supplied", async () => {
    const user = userEvent.setup();
    render(<AiSearchPanels />);

    await user.type(screen.getByLabelText(/category/i), "cloud hosting");
    await user.selectOptions(screen.getByLabelText(/budget/i), "low");
    await user.type(screen.getByLabelText(/location/i), "Bahir Dar");
    await user.click(screen.getByRole("button", { name: /get recommendations/i }));

    expect(state.recommend.mutate).toHaveBeenCalledWith({
      category: "cloud hosting",
      budget: "low",
      location: "Bahir Dar",
    });
  });

  it("does not recommend on an empty category", async () => {
    const user = userEvent.setup();
    render(<AiSearchPanels />);

    await user.click(screen.getByRole("button", { name: /get recommendations/i }));
    expect(state.recommend.mutate).not.toHaveBeenCalled();
  });

  it("numbers the shortlist and shows each reason", () => {
    reset({
      recommend: {
        data: [
          { id: "org-2", name: "Habesha Cloud Services", reason: "Within budget.", score: 0.6 },
          { id: "org-3", name: "Amhara IT Consultancy", reason: "Broad catalogue fit.", score: 0.4 },
        ],
      },
    });
    render(<AiSearchPanels />);

    expect(screen.getByText(/#1/)).toBeInTheDocument();
    expect(screen.getByText(/#2/)).toBeInTheDocument();
    expect(screen.getByText("Within budget.")).toBeInTheDocument();
    expect(screen.getByText("60% fit")).toBeInTheDocument();
  });

  it("renders an empty state when no provider matched", () => {
    reset({ recommend: { data: [] } });
    render(<AiSearchPanels />);

    expect(screen.getByText("No recommendations")).toBeInTheDocument();
  });
});
