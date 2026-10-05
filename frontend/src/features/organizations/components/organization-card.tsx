"use client";

import Link from "next/link";
import { BadgeCheckIcon, MapPinIcon, StarIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Organization, VerificationStatus } from "@/types";

import { useOrganizationUiStore } from "../store/organization-store";
import { VERIFICATION_LABELS } from "../types";

const BADGE_VARIANT: Record<VerificationStatus, "success" | "warning" | "muted"> = {
  VERIFIED: "success",
  PENDING: "warning",
  REJECTED: "muted",
};

interface OrganizationCardProps {
  organization: Organization;
}

export function OrganizationCard({ organization }: OrganizationCardProps) {
  const selectedIds = useOrganizationUiStore((state) => state.selectedIds);
  const toggleSelected = useOrganizationUiStore((state) => state.toggleSelected);

  const isSelected = selectedIds.includes(organization.id);
  const isVerified = organization.verification_status === "VERIFIED";
  const hasRating = organization.rating !== null;

  return (
    <article
      className={cn(
        // Stretched link on the title makes the whole card clickable without
        // nesting interactive elements, so the compare checkbox stays usable.
        "group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm",
        "transition-[box-shadow,border-color,transform] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg",
        isSelected && "border-primary/50 ring-2 ring-ring/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-base leading-tight font-semibold">
            <Link
              href={`/organizations/${organization.id}`}
              className="rounded outline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:text-primary"
            >
              {organization.name}
            </Link>
          </h3>
          {organization.location && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{organization.location}</span>
            </p>
          )}
        </div>

        <Badge variant={BADGE_VARIANT[organization.verification_status]}>
          {isVerified && <BadgeCheckIcon aria-hidden="true" />}
          {VERIFICATION_LABELS[organization.verification_status]}
        </Badge>
      </div>

      {organization.description ? (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {organization.description}
        </p>
      ) : (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground/70 italic">
          No description yet.
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <span className="flex items-center gap-1.5 text-sm font-medium tabular-nums">
          <StarIcon
            className={cn(
              "size-4",
              hasRating ? "fill-warning text-warning" : "text-muted-foreground/50",
            )}
            aria-hidden="true"
          />
          {organization.rating !== null ? organization.rating.toFixed(1) : "Unrated"}
          {organization.rating === null && <span className="sr-only">rating</span>}
        </span>

        {/* `relative z-10` lifts the control above the stretched link overlay. */}
        <label className="relative z-10 flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <Checkbox
            checked={isSelected}
            onChange={() => toggleSelected(organization.id)}
          />
          Compare
        </label>
      </div>
    </article>
  );
}

export function OrganizationCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="w-2/3 space-y-2">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-5/6 rounded bg-muted" />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="h-3 w-12 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}
