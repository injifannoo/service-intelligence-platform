"use client";

import { useState } from "react";
import { ScaleIcon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { useOrganizations } from "@/features/organizations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";

import { useCompare } from "../api/use-comparison";
import { ComparisonTable } from "./comparison-table";

const CRITERIA = [
  { value: "rating", label: "Customer rating" },
  { value: "services", label: "Services offered" },
  { value: "location", label: "Location" },
];

/** Upper bound chosen for a readable matrix; not specified by any document. */
const MAX_ORGANIZATIONS = 4;

/**
 * Comparison builder, docs/05_API_Design.md:493-520.
 *
 * The request needs at least two organizations, so a single checkbox cannot
 * produce a valid request; the form surfaces the server's rule rather than
 * duplicating it.
 */
export function ComparisonBuilder() {
  const organizationsQuery = useOrganizations({ page_size: 50 });
  const compare = useCompare();

  const [selected, setSelected] = useState<string[]>([]);
  const [criteria, setCriteria] = useState<string[]>(["rating", "services"]);
  const [formError, setFormError] = useState<string | null>(null);

  const organizations = organizationsQuery.data?.data ?? [];

  function toggleOrganization(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= MAX_ORGANIZATIONS) return current;
      return [...current, id];
    });
  }

  function toggleCriterion(value: string) {
    setCriteria((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function handleCompare() {
    setFormError(null);
    try {
      await compare.mutateAsync({ organizations: selected, criteria });
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Could not run the comparison.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-medium">
            Organizations ({selected.length}/{MAX_ORGANIZATIONS})
          </h2>

          {organizationsQuery.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : (
            <ul className="scrollbar-slim max-h-80 space-y-0.5 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-xs">
              {organizations.map((organization) => {
                const checked = selected.includes(organization.id);
                const disabled =
                  !checked && selected.length >= MAX_ORGANIZATIONS;

                return (
                  <li
                    key={organization.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
                  >
                    <Checkbox
                      id={`compare-${organization.id}`}
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleOrganization(organization.id)}
                    />
                    <Label
                      htmlFor={`compare-${organization.id}`}
                      className="min-w-0 flex-1 cursor-pointer truncate font-normal"
                    >
                      {organization.name}
                    </Label>
                    {organization.verification_status === "VERIFIED" && (
                      <Badge variant="success">Verified</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">Criteria</h2>
          <ul className="space-y-0.5 rounded-lg border border-border bg-card p-2 shadow-xs">
            {CRITERIA.map((criterion) => (
              <li
                key={criterion.value}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
              >
                <Checkbox
                  id={`criterion-${criterion.value}`}
                  checked={criteria.includes(criterion.value)}
                  onChange={() => toggleCriterion(criterion.value)}
                />
                <Label
                  htmlFor={`criterion-${criterion.value}`}
                  className="cursor-pointer font-normal"
                >
                  {criterion.label}
                </Label>
              </li>
            ))}
          </ul>

          {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

          <Button
            onClick={handleCompare}
            loading={compare.isPending}
            disabled={selected.length < 2 || criteria.length === 0}
          >
            <ScaleIcon />
            {compare.isPending ? "Comparing" : "Compare"}
          </Button>
        </section>
      </div>

      {compare.data && (
        <ComparisonTable
          organizations={compare.data.organizations}
          criteria={compare.data.criteria}
        />
      )}
    </div>
  );
}
