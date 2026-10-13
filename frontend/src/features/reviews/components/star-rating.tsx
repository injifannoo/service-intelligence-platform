"use client";

import { StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { RATING_DIMENSIONS, RATING_DIMENSION_LABELS, type ReviewScores } from "@/types";

export const RATING_SCALE = [1, 2, 3, 4, 5] as const;

/** Static star row, half of the read/write pair below. */
export function StarRating({
  rating,
  className,
}: {
  rating: number | null | undefined;
  className?: string;
}) {
  const value = Math.round(rating ?? 0);

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={rating ? `Rated ${rating} out of 5` : "Not yet rated"}
    >
      {RATING_SCALE.map((step) => (
        <StarIcon
          key={step}
          className={cn(
            "size-4",
            step <= value ? "fill-warning text-warning" : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  name: string;
  invalid?: boolean;
  /** Fieldset legend; defaults to the plain "Rating" the form historically used. */
  legend?: string;
}

/**
 * Radio-backed star input.
 *
 * Built from real radio inputs rather than buttons so keyboard users get arrow
 * key navigation and a form submission value for free. 1-5 is an assumption
 * recorded in src/types/index.ts contradiction 4.
 */
export function RatingInput({
  value,
  onChange,
  name,
  invalid = false,
  legend = "Rating",
}: RatingInputProps) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-1.5 flex items-center gap-1">
        {RATING_SCALE.map((step) => {
          const id = `${name}-${step}`;
          return (
            <label
              key={step}
              htmlFor={id}
              className={cn(
                "cursor-pointer p-0.5",
                invalid && "text-destructive",
                "hover:text-warning focus-within:ring-2 focus-within:ring-ring rounded-md",
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={step}
                checked={value === step}
                onChange={() => onChange(step)}
                className="sr-only"
              />
              <StarIcon
                className={cn(
                  "size-6",
                  step <= value
                    ? "fill-warning text-warning"
                    : "text-muted-foreground/40",
                )}
              />
              <span className="sr-only">
                {step} out of 5
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface RatingBreakdownInputProps {
  value: Partial<ReviewScores>;
  onChange: (value: Partial<ReviewScores>) => void;
  invalid?: boolean;
}

/**
 * The five-dimension breakdown, docs/04_Database_Design.md:357-375.
 *
 * One labelled star row per dimension. The overall experience row is the same
 * score the review carries as `rating`, so the form stays consistent with the
 * aggregate every other surface reads.
 */
export function RatingBreakdownInput({
  value,
  onChange,
  invalid = false,
}: RatingBreakdownInputProps) {
  return (
    <div className="space-y-3">
      {RATING_DIMENSIONS.map((dimension) => (
        <RatingInput
          key={dimension}
          name={`rating-${dimension}`}
          legend={RATING_DIMENSION_LABELS[dimension]}
          value={value[dimension] ?? 0}
          onChange={(score) => onChange({ ...value, [dimension]: score })}
          invalid={invalid}
        />
      ))}
    </div>
  );
}
