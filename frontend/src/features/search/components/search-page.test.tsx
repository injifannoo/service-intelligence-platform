import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CATEGORIES } from "@/lib/data";
import { ORG_VIEWS } from "@/test/fixtures/org-views";

const navigation = vi.hoisted(() => ({ query: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.query),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/components/shared/site", () => ({
  Page: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Stars: ({ value }: { value: number }) => <span>{value} stars</span>,
  TrustBadge: ({ score }: { score: number }) => <span>{score} trust</span>,
  Loading: () => <p>Loading.</p>,
  inputCls: "",
}));

vi.mock("@/features/organizations", () => ({
  getOrganizations: () => ({
    queryKey: ["orgs"],
    queryFn: async () => ORG_VIEWS,
  }),
}));

vi.mock("@/lib/ai.functions", () => ({
  understandQuery: vi.fn(async () => null),
}));

import { SearchPage } from "./search-page";

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SearchPage />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  navigation.query = "";
});

describe("SearchPage categories and data states", () => {
  it("renders all eight providers from the mock catalogue", async () => {
    renderPage();

    expect(await screen.findByText("8 providers")).toBeInTheDocument();
  });

  it("offers all eight canonical categories plus the all-categories option", async () => {
    const { container } = renderPage();
    await screen.findByText("8 providers");

    const select = container.querySelector("select")!;
    const options = within(select).getAllByRole("option");

    expect(options).toHaveLength(CATEGORIES.length + 1);
    expect(options.map((option) => option.textContent)).toEqual([
      "All categories",
      ...CATEGORIES,
    ]);
  });

  it("filters providers when a category is chosen", async () => {
    const { container } = renderPage();
    await screen.findByText("8 providers");

    const select = container.querySelector("select")!;
    fireEvent.change(select, { target: { value: "Mobile Apps" } });

    expect(await screen.findByText("1 providers")).toBeInTheDocument();
    expect(screen.getByText("Provider 2")).toBeInTheDocument();
    expect(screen.queryByText("Provider 1")).toBeNull();
  });

  it("shows the verified-only filter state", async () => {
    renderPage();
    await screen.findByText("8 providers");

    const verified = screen.getByLabelText("Verified only");
    fireEvent.click(verified);

    // Providers 1 and 5 are unverified in the fixture; six of eight remain.
    expect(await screen.findByText("6 providers")).toBeInTheDocument();
  });
});
