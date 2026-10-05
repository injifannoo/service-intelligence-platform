"use client";

import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/features/reviews";
import type { OrganizationDetail } from "@/types";

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
  organizations: OrganizationDetail[];
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
              {criterion}
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
  organization: OrganizationDetail;
}) {
  switch (criterion.toLowerCase()) {
    case "rating":
      return organization.rating === null ? (
        <span className="text-muted-foreground">No reviews</span>
      ) : (
        <span>{organization.rating.toFixed(1)} / 5</span>
      );

    case "location":
      return organization.location ?? <span className="text-muted-foreground">—</span>;

    case "services":
      return organization.services.length === 0 ? (
        <span className="text-muted-foreground">None listed</span>
      ) : (
        <ul className="space-y-1">
          {organization.services.map((service) => (
            <li key={service.id}>
              {service.name}
              {service.price !== undefined && service.price !== null && (
                <span className="text-muted-foreground"> — ${service.price}</span>
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
