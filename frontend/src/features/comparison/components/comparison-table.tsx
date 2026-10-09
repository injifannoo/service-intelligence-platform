"use client";

import { Badge } from "@/components/ui/badge";
import {
  VERIFICATION_BADGE_VARIANT,
  VERIFICATION_LABELS,
} from "@/features/organizations";
import { StarRating } from "@/features/reviews";
import type { ComparisonRow } from "@/types";

import { criterionLabel } from "../comparison-criteria";

/**
 * Side-by-side comparison matrix.
 *
 * A CSS grid rather than a `<table>`: each cell is a short value or a nested
 * service list, so rows do not align across columns the way table semantics
 * would require, and `role="row"/"cell"` on the wrappers keeps it announceable.
 */
export function ComparisonTable({
  organizations,
  criteria,
}: {
  organizations: ComparisonRow[];
  criteria: string[];
}) {
  return (
    <div className="space-y-6">
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${organizations.length}, minmax(0, 1fr))` }}
      >
        {organizations.map((organization) => (
          <div key={organization.id} className="rounded-lg border border-border p-4">
            <h3 className="font-semibold leading-tight">{organization.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StarRating rating={organization.rating} />
              {organization.rating !== null && (
                <span className="text-sm text-muted-foreground">
                  {organization.rating.toFixed(1)}
                </span>
              )}
            </div>
            {organization.verification_status === "VERIFIED" && (
              <Badge variant="success" className="mt-2">
                Verified
              </Badge>
            )}
            {organization.location && (
              <p className="mt-2 text-sm text-muted-foreground">
                {organization.location}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {criteria.map((criterion) => (
          <div key={criterion} className="rounded-lg border border-border">
            <p className="border-b border-border bg-muted/40 px-4 py-2 text-sm font-medium">
              {criterionLabel(criterion)}
            </p>
            <div
              className="grid gap-px bg-border"
              style={{
                gridTemplateColumns: `repeat(${organizations.length}, minmax(0, 1fr))`,
              }}
            >
              {organizations.map((organization) => (
                <div key={organization.id} className="bg-background px-4 py-3 text-sm">
                  <CriterionValue
                    criterion={criterion}
                    organization={organization}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CriterionValue({
  criterion,
  organization,
}: {
  criterion: string;
  organization: ComparisonRow;
}) {
  switch (criterion.trim().toLowerCase()) {
    case "rating":
      return organization.rating === null ? (
        <span className="text-muted-foreground">No reviews</span>
      ) : (
        <span>{organization.rating.toFixed(1)} / 5</span>
      );

    case "reviews": {
      const count = organization.review_count ?? 0;
      return count === 0 ? (
        <span className="text-muted-foreground">No reviews</span>
      ) : (
        <span className="tabular-nums">
          {count} {count === 1 ? "review" : "reviews"}
        </span>
      );
    }

    case "price":
      return <PriceRange services={organization.services} />;

    case "location":
      return organization.location ?? <span className="text-muted-foreground">—</span>;

    case "verification":
      return (
        <Badge variant={VERIFICATION_BADGE_VARIANT[organization.verification_status]}>
          {VERIFICATION_LABELS[organization.verification_status]}
        </Badge>
      );

    case "sentiment": {
      const score = organization.sentiment_score;
      if (score === null || score === undefined) {
        return <span className="text-muted-foreground">Nothing to score</span>;
      }
      return <span className="tabular-nums">{Math.round(score * 100)} / 100</span>;
    }

    case "services":
      return organization.services.length === 0 ? (
        <span className="text-muted-foreground">None listed</span>
      ) : (
        <ul className="space-y-1">
          {organization.services.map((service) => (
            <li key={service.id}>
              {service.name}
              {service.price !== undefined && service.price !== null && (
                // contradiction 8: docs/04 defines no currency column, so the
                // price is drawn bare rather than with an assumed symbol.
                <span className="text-muted-foreground"> — {service.price}</span>
              )}
            </li>
          ))}
        </ul>
      );

    default:
      // An unknown criterion must not render as a false blank, so it says so.
      return (
        <span className="text-muted-foreground">
          Not available for this criterion.
        </span>
      );
  }
}

/**
 * Spread of listed prices for the "Price" criterion.
 *
 * docs/02:189-199 asks for price without defining an aggregate, and a single
 * organization has no meaningful average of one service, so the range answers
 * "what does this cost?" without inventing a figure.
 */
function PriceRange({ services }: { services: ComparisonRow["services"] }) {
  const prices = services
    .map((service) => service.price)
    .filter((price): price is number => typeof price === "number");

  if (prices.length === 0) {
    return <span className="text-muted-foreground">Not listed</span>;
  }

  const low = Math.min(...prices);
  const high = Math.max(...prices);

  // contradiction 8: no currency column exists, so no symbol is drawn.
  return (
    <span className="tabular-nums">{low === high ? low : `${low} – ${high}`}</span>
  );
}
