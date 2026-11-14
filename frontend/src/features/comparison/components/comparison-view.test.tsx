import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ORG_VIEWS } from "@/test/fixtures/org-views";

const navigation = vi.hoisted(() => ({ ids: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.ids ? `ids=${navigation.ids}` : ""),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/components/shared/site", () => ({
  Page: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Stars: ({ value }: { value: number }) => <span>{value} stars</span>,
  Loading: () => <p>Loading.</p>,
}));

vi.mock("@/features/comparison", () => ({
  AiComparisonSummary: ({ orgs }: { orgs: unknown[] }) => (
    <div>AI comparison for {orgs.length} providers</div>
  ),
}));

vi.mock("@/features/organizations", () => ({
  getOrganizations: () => ({
    queryKey: ["orgs"],
    queryFn: async () => ORG_VIEWS,
  }),
}));

import { ComparisonView } from "./comparison-view";

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ComparisonView />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  navigation.ids = "";
});

describe("ComparisonView data states", () => {
  it("lists all eight providers before a comparison is selected", async () => {
    renderPage();

    for (const org of ORG_VIEWS) {
      expect(await screen.findByRole("button", { name: org.name })).toBeInTheDocument();
    }
    expect(screen.getByText("Select at least two providers to compare.")).toBeInTheDocument();
  });

  it("renders the comparison matrix once two providers are selected", async () => {
    navigation.ids = "provider-1,provider-2";

    renderPage();

    expect(await screen.findByRole("heading", { name: "Compare providers" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Provider 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Provider 2" })).toBeInTheDocument();
    expect(screen.getByText("AI trust score")).toBeInTheDocument();
    expect(screen.getByText("Positive sentiment")).toBeInTheDocument();
    expect(screen.getByText("AI comparison for 2 providers")).toBeInTheDocument();
    expect(screen.queryByText("Select at least two providers to compare.")).toBeNull();
  });

  it("ignores unknown slugs in the ids parameter", async () => {
    navigation.ids = "provider-1,does-not-exist";

    renderPage();

    await screen.findByRole("heading", { name: "Compare providers" });
    await screen.findByRole("button", { name: ORG_VIEWS[0].name });
    expect(screen.getByText("Select at least two providers to compare.")).toBeInTheDocument();
  });
});
