import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Minimal SVG bar chart.
 *
 * ## Why hand-rolled
 *
 * This is the only chart in the product, and it renders a handful of bars. A
 * charting library would add a large dependency, a client-only boundary, and its
 * own styling system that would then need overriding to match the rest of the UI.
 *
 * ## Accessibility
 *
 * SVG is invisible to assistive technology by default, so the visual is marked
 * `aria-hidden` and a real `<table>` carries the same data. Screen readers get
 * numbers; sighted users get the shape.
 *
 * ## Domain-agnostic by requirement
 *
 * `src/components/ui/` must not know what it is plotting, so this takes plain
 * labelled values and knows nothing about ratings, sentiment, or dates.
 */

export interface ChartDatum {
  label: string;
  value: number;
}

interface BarChartProps extends React.ComponentProps<"figure"> {
  data: readonly ChartDatum[];
  /** Rendered beside each bar, e.g. "4.5 / 5". Defaults to the raw value. */
  formatValue?: (value: number) => string;
  /** Accessible name for the whole chart. */
  title: string;
  caption?: string;
  /** Lower bound of the value axis. Defaults to 0. */
  min?: number;
  max?: number;
  /** Bars are emphasised in this colour when provided. */
  highlightLabel?: string;
}

export function BarChart({
  data,
  formatValue,
  title,
  caption,
  min = 0,
  max,
  highlightLabel,
  className,
  ...props
}: BarChartProps) {
  const upperBound = max ?? Math.max(...data.map((datum) => datum.value), min + 1);
  const span = upperBound - min || 1;

  const rows = data.map((datum) => {
    // Clamped so an out-of-range value cannot overflow the plot area.
    const ratio = Math.min(1, Math.max(0, (datum.value - min) / span));
    return { datum, ratio, isHighlighted: datum.label === highlightLabel };
  });

  return (
    <figure className={cn("space-y-3", className)} {...props}>
      {caption && <figcaption className="text-sm text-muted-foreground">{caption}</figcaption>}

      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <>
          <div aria-hidden="true" className="space-y-2">
            {rows.map(({ datum, ratio, isHighlighted }) => (
              <div key={datum.label} className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-24 shrink-0 truncate text-xs",
                    isHighlighted ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                  title={datum.label}
                >
                  {datum.label}
                </span>
                <Bar ratio={ratio} isHighlighted={isHighlighted} />
                <span
                  className={cn(
                    "w-14 shrink-0 text-right text-xs tabular-nums",
                    isHighlighted ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {formatValue ? formatValue(datum.value) : datum.value}
                </span>
              </div>
            ))}
          </div>

          <table className="sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">Label</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.map((datum) => (
                <tr key={datum.label}>
                  <th scope="row">{datum.label}</th>
                  <td>{formatValue ? formatValue(datum.value) : datum.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}

/**
 * A single bar drawn as SVG so the fill and track share one coordinate system and
 * the value axis stays inspectable in devtools.
 *
 * `preserveAspectRatio="none"` lets the rect stretch to the flexible row width;
 * the height is fixed via the viewBox, so no distortion is visible.
 */
function Bar({ ratio, isHighlighted }: { ratio: number; isHighlighted: boolean }) {
  const percent = ratio * 100;

  return (
    <svg
      className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      focusable="false"
    >
      <rect x={0} y={0} width={100} height={10} rx={5} className="fill-muted" />
      <rect
        x={0}
        y={0}
        // A zero-width rect is invisible, which is the correct rendering for a
        // value at or below the axis minimum.
        width={percent}
        height={10}
        rx={5}
        className={cn(
          "transition-[width] duration-500",
          isHighlighted ? "fill-primary" : "fill-primary/45",
        )}
      />
    </svg>
  );
}

/**
 * Horizontal proportion bar for a two-way split, e.g. sentiment.
 *
 * Kept separate from `BarChart` because a stacked proportion is a different
 * shape, not a bar chart with one series.
 */
export interface SplitBarProps extends React.ComponentProps<"div"> {
  positive: number;
  negative: number;
  positiveLabel: string;
  negativeLabel: string;
}

export function SplitBar({
  positive,
  negative,
  positiveLabel,
  negativeLabel,
  className,
  ...props
}: SplitBarProps) {
  const total = positive + negative || 1;
  const positivePct = Math.round((positive / total) * 100);

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <div
        aria-hidden="true"
        className="flex h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <span className="block h-full bg-success" style={{ width: `${positivePct}%` }} />
        <span className="block h-full bg-destructive/70" style={{ width: `${100 - positivePct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {positiveLabel} <span className="font-semibold text-success">{positivePct}%</span>
        </span>
        <span>
          {negativeLabel} <span className="font-semibold text-destructive">{100 - positivePct}%</span>
        </span>
      </div>
    </div>
  );
}
