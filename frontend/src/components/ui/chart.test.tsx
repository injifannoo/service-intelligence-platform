import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { BarChart, SplitBar } from "@/components/ui/chart";

describe("BarChart", () => {
  const data = [
    { label: "2026-02", value: 3.5 },
    { label: "2026-03", value: 4.5 },
  ];

  it("renders a row per datum", () => {
    render(<BarChart data={data} title="Rating trend" />);
    // Each label appears twice by design: once in the aria-hidden bar and once in
    // the sr-only table.
    expect(screen.getAllByText("2026-02")).toHaveLength(2);
    expect(screen.getAllByText("2026-03")).toHaveLength(2);
  });

  it("exposes the values to assistive technology via a real table", () => {
    render(<BarChart data={data} title="Rating trend" caption="Average rating" />);

    // The bars are aria-hidden, so the table is the only accessible surface.
    const table = screen.getByRole("table");
    expect(within(table).getByRole("rowheader", { name: "2026-02" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "3.5" })).toBeInTheDocument();
    expect(screen.getByText("Average rating")).toBeInTheDocument();
  });

  it("applies a custom value format", () => {
    render(
      <BarChart data={data} title="Rating trend" formatValue={(value) => `${value.toFixed(1)}/5`} />,
    );
    expect(screen.getAllByText("3.5/5").length).toBeGreaterThan(0);
  });

  it("renders an empty state instead of a blank chart", () => {
    render(<BarChart data={[]} title="Rating trend" />);
    expect(screen.getByText("No data yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders bars as SVG rects with a track and a clamped fill", () => {
    const { container } = render(
      <BarChart data={[{ label: "max", value: 99 }]} title="t" min={1} max={5} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();

    const rects = svg!.querySelectorAll("rect");
    expect(rects).toHaveLength(2);
    // The track always spans the full width.
    expect(rects[0].getAttribute("width")).toBe("100");
    // 99 on a 1..5 axis must clamp to the axis maximum, not overflow.
    expect(rects[1].getAttribute("width")).toBe("100");
  });

  it("renders a zero-width fill for a value at the axis minimum", () => {
    const { container } = render(
      <BarChart data={[{ label: "min", value: 1 }]} title="t" min={1} max={5} />,
    );

    const rects = container.querySelectorAll("rect");
    expect(rects[1].getAttribute("width")).toBe("0");
  });

  it("scales the fill proportionally within the axis range", () => {
    const { container } = render(
      <BarChart data={[{ label: "mid", value: 3 }]} title="t" min={1} max={5} />,
    );

    // (3 - 1) / (5 - 1) = 50%
    const rects = container.querySelectorAll("rect");
    expect(rects[1].getAttribute("width")).toBe("50");
  });

  it("defaults the axis floor to zero", () => {
    const { container } = render(
      <BarChart data={[{ label: "half", value: 25 }, { label: "full", value: 50 }]} title="t" />,
    );

    // The fill is always the second rect inside each bar's svg.
    const fills = [...container.querySelectorAll("svg")].map(
      (svg) => svg.querySelectorAll("rect")[1],
    );
    expect(fills).toHaveLength(2);
    expect(fills[0].getAttribute("width")).toBe("50");
    expect(fills[1].getAttribute("width")).toBe("100");
  });
});

describe("SplitBar", () => {
  it("renders both labels with their percentages", () => {
    render(
      <SplitBar positive={75} negative={25} positiveLabel="Positive" negativeLabel="Negative" />,
    );
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("normalises inputs that do not sum to 100", () => {
    render(<SplitBar positive={1} negative={1} positiveLabel="P" negativeLabel="N" />);
    // Both sides are 50%, so both are present.
    expect(screen.getAllByText("50%")).toHaveLength(2);
  });

  it("does not divide by zero", () => {
    render(<SplitBar positive={0} negative={0} positiveLabel="P" negativeLabel="N" />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});