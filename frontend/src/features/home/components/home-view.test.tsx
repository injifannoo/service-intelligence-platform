import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/shared/site", () => ({
  Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: ({ value }: { value: number }) => <div data-testid="bar">{value}</div>,
}));

import { HomeView } from "./home-view";

const SECTORS = [
  "Healthcare",
  "Hotels",
  "Restaurants",
  "Education",
  "Software and IT Services",
  "Financial Services",
  "Home and Professional Services",
  "Other Services",
];

describe("HomeView category rollout", () => {
  it("renders all eight sector cards", () => {
    render(<HomeView />);

    for (const name of SECTORS) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("marks one live sector, one browse-all sector and six coming soon", () => {
    render(<HomeView />);

    expect(screen.getAllByText("● Live")).toHaveLength(1);
    expect(screen.getAllByText("All")).toHaveLength(1);
    expect(screen.getAllByText("Coming soon")).toHaveLength(6);
  });

  it("links live and browse-all cards to search and leaves the rest disabled", () => {
    const { container } = render(<HomeView />);

    const software = screen.getByText("Software and IT Services").closest("a");
    const other = screen.getByText("Other Services").closest("a");
    const health = screen.getByText("Healthcare").closest("[aria-disabled]");

    expect(software).toHaveAttribute("href", "/search");
    expect(other).toHaveAttribute("href", "/search");
    expect(health).not.toBeNull();
    expect(container.querySelectorAll("[aria-disabled]")).toHaveLength(6);
  });

  it("renders the natural-language demo insight", () => {
    render(<HomeView />);

    expect(screen.getByText("Lucy Cloud Systems")).toBeInTheDocument();
    expect(screen.getByText(/Positive, 74%/)).toBeInTheDocument();
    expect(screen.getByText("Slow quotation response")).toBeInTheDocument();
  });
});
