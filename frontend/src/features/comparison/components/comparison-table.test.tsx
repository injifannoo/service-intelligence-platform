import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";

import type { ComparisonRow, Service, VerificationStatus } from "@/types";

import { COMPARISON_CRITERIA, criterionLabel } from "../comparison-criteria";
import { ComparisonTable } from "./comparison-table";

/**
 * Comparison matrix.
 *
 * docs/02:189-199 defines what may be compared and docs/09:380 adds price,
 * verification status, and the AI sentiment index, so the rows are asserted by
 * the criterion each one renders rather than by the presence of any cell.
 */

function row(overrides: Partial<ComparisonRow> = {}): ComparisonRow {
  return {
    id: "org-1",
    name: "ABC Technology",
    description: null,
    industry_id: null,
    location: "Addis Ababa",
    phone: null,
    website: null,
    verification_status: "VERIFIED",
    rating: 4,
    created_at: "2026-01-01T00:00:00.000Z",
    services: [],
    review_count: 0,
    ...overrides,
  };
}

function service(id: string, price: number | null): Service {
  return {
    id,
    organization_id: "org-1",
    name: `Service ${id}`,
    description: null,
    price,
    status: true,
  };
}

function matrix(criteria: string[], organizations: ComparisonRow[]) {
  return render(<ComparisonTable organizations={organizations} criteria={criteria} />);
}

/**
 * Queries inside one criterion's row.
 *
 * The organization header above the matrix repeats `location` and the
 * `Verified` badge, so an unscoped query matches twice for a perfectly
 * correct render.
 */
function criterionCells(label: string, container: HTMLElement) {
  const header = within(container).getByText(label);
  const cells = header.parentElement;
  if (!cells) throw new Error(`No criterion row found for "${label}"`);
  return within(cells);
}

describe("criterion labels", () => {
  it("labels every criterion the builder can offer", () => {
    // A key the form sends but the matrix cannot label would render as a bare
    // lowercase token in the row header.
    for (const criterion of COMPARISON_CRITERIA) {
      expect(criterionLabel(criterion.value)).toBe(criterion.label);
    }
  });

  it("is case-insensitive about the keys the API echoes back", () => {
    expect(criterionLabel("SENTIMENT")).toBe("AI score");
  });

  it("falls back to the raw key rather than an empty header", () => {
    expect(criterionLabel("nonsense")).toBe("nonsense");
  });
});

describe("row headers", () => {
  it("renders display labels instead of raw criterion keys", () => {
    const { queryByText, getByText } = matrix(
      ["rating", "sentiment", "verification"],
      [row()],
    );

    expect(getByText("Customer rating")).toBeDefined();
    expect(getByText("AI score")).toBeDefined();
    expect(getByText("Verification status")).toBeDefined();
    expect(queryByText("sentiment")).toBeNull();
    expect(queryByText("verification")).toBeNull();
  });
});

describe("reviews", () => {
  it("renders the count with correct pluralization", () => {
    const one = matrix(["reviews"], [row({ review_count: 1 })]);
    expect(one.getByText("1 review")).toBeDefined();
    one.unmount();

    const many = matrix(["reviews"], [row({ review_count: 12 })]);
    expect(many.getByText("12 reviews")).toBeDefined();
  });

  it("distinguishes zero reviews from an unset count", () => {
    const { getByText } = matrix(["reviews"], [row({ review_count: 0 })]);
    expect(getByText("No reviews")).toBeDefined();
  });
});

describe("price", () => {
  it("shows the spread across listed services", () => {
    const { getByText } = matrix(
      ["price"],
      [row({ services: [service("a", 10), service("b", 90)] })],
    );

    expect(getByText("10 – 90")).toBeDefined();
  });

  it("collapses a range of one price to the price", () => {
    const { getByText } = matrix(["price"], [row({ services: [service("a", 25)] })]);
    expect(getByText("25")).toBeDefined();
  });

  it("says when no price is listed rather than showing nothing", () => {
    const unpriced = matrix(["price"], [row({ services: [service("a", null)] })]);
    expect(unpriced.getByText("Not listed")).toBeDefined();
    unpriced.unmount();

    const noServices = matrix(["price"], [row()]);
    expect(noServices.getByText("Not listed")).toBeDefined();
  });

  it("never draws a currency symbol", () => {
    // contradiction 8: docs/04 defines no currency column, so a symbol would be
    // an invention presented as fact.
    const { container } = matrix(
      ["price", "services"],
      [row({ services: [service("a", 10), service("b", 90)] })],
    );

    expect(container.textContent).not.toContain("$");
  });
});

describe("verification status", () => {
  it("renders a label for every status", () => {
    const expected: Record<VerificationStatus, string> = {
      VERIFIED: "Verified",
      PENDING: "Pending verification",
      REJECTED: "Not verified",
    };

    for (const [status, label] of Object.entries(expected)) {
      const view = matrix(["verification"], [
        row({ verification_status: status as VerificationStatus }),
      ]);

      expect(
        criterionCells("Verification status", view.container).getByText(label),
      ).toBeDefined();
      view.unmount();
    }
  });
});

describe("AI score", () => {
  it("renders the index out of 100", () => {
    const { getByText } = matrix(["sentiment"], [row({ sentiment_score: 0.72 })]);
    expect(getByText("72 / 100")).toBeDefined();
  });

  it("does not present a missing score as a neutral one", () => {
    // 0.5 would read as "middling"; an organization with no reviews has no
    // sentiment at all.
    const { getByText } = matrix(["sentiment"], [row({ sentiment_score: null })]);
    expect(getByText("Nothing to score")).toBeDefined();
  });
});

describe("other criteria", () => {
  it("keeps the rating and location rows", () => {
    const rated = matrix(["rating", "location"], [row({ rating: 4.2 })]);
    expect(rated.getByText("4.2 / 5")).toBeDefined();
    expect(
      criterionCells("Location", rated.container).getByText("Addis Ababa"),
    ).toBeDefined();
    rated.unmount();

    const unrated = matrix(["rating"], [row({ rating: null })]);
    expect(unrated.getByText("No reviews")).toBeDefined();
  });

  it("lists services with bare prices", () => {
    const { getByText, container } = matrix(
      ["services"],
      [row({ services: [service("a", 300)] })],
    );

    expect(getByText("Service a")).toBeDefined();
    expect(container.textContent).not.toContain("$");
  });

  it("says when an organization lists no services", () => {
    const { getByText } = matrix(["services"], [row()]);
    expect(getByText("None listed")).toBeDefined();
  });

  it("refuses to render an unknown criterion as a blank cell", () => {
    const { getByText } = matrix(["mystery"], [row()]);
    expect(getByText("Not available for this criterion.")).toBeDefined();
  });
});
