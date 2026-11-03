"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DownloadIcon, ScaleIcon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { useOrganizations } from "@/features/organizations";
import { useOrganizationUiStore } from "@/features/organizations/store/organization-store";
import { getCustomerPermissions, getCustomerTier, useCurrentUser } from "@/features/authentication";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";

import { COMPARISON_CRITERIA } from "../comparison-criteria";
import { useCompare } from "../api/use-comparison";
import { ComparisonTable } from "./comparison-table";

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
  const { data: currentUser } = useCurrentUser();
  const organizationsQuery = useOrganizations({ page_size: 50 });
  const compare = useCompare();

  const customerTier = getCustomerTier(currentUser);
  const permissions = getCustomerPermissions(customerTier);
  const maxOrganizations = permissions.canCompare ? permissions.maxComparisonCount : 0;
  const searchParams = useSearchParams();
  const storeSelected = useOrganizationUiStore((state) => state.selectedIds);
  const orgsParam = searchParams.get("orgs");
  const autoComparedRef = useRef(false);

  const [selected, setSelected] = useState<string[]>(() => {
    if (orgsParam) return orgsParam.split(",").filter(Boolean);
    return storeSelected;
  });
  const [criteria, setCriteria] = useState<string[]>(["sentiment", "rating"]);
  const [formError, setFormError] = useState<string | null>(null);

  const organizations = organizationsQuery.data?.data ?? [];

  useEffect(() => {
    const list = orgsParam ? orgsParam.split(",").filter(Boolean) : storeSelected;
    if (list.length > 0) {
      const allowed = maxOrganizations > 0 ? list.slice(0, maxOrganizations) : list.slice(0, 2);
      setSelected(allowed);
      if (permissions.canCompare && allowed.length >= 2 && !autoComparedRef.current) {
        autoComparedRef.current = true;
        void compare.mutateAsync({ organizations: allowed, criteria });
      }
    }
  }, [orgsParam, maxOrganizations, permissions.canCompare]);

  function toggleOrganization(id: string) {
    if (!permissions.canCompare) return;
    setSelected((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= maxOrganizations) return current;
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
    if (!permissions.canCompare) {
      setFormError("Please sign in with a registered account to run comparisons.");
      return;
    }
    setFormError(null);
    try {
      await compare.mutateAsync({ organizations: selected, criteria });
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Could not run the comparison.",
      );
    }
  }

  function handleExportCsv() {
    if (!compare.data) return;
    const headers = ["Organization", "Rating", "Review Count", "Location", "Verification Status"];
    const rows = compare.data.organizations.map((org) => [
      `"${org.name.replace(/"/g, '""')}"`,
      org.rating ?? "N/A",
      org.review_count ?? 0,
      `"${(org.location || "").replace(/"/g, '""')}"`,
      org.verification_status,
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `comparison-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {!permissions.canCompare && (
        <AlertMessage tone="info" title="Guest Access">
          You are browsing as a Guest. Sign in with a registered account to run comparisons
          (Standard: 2 providers, Verified: 4 providers, Premium: up to 10 providers with export).
        </AlertMessage>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">
              Organizations ({selected.length}/{maxOrganizations})
            </h2>
            <Badge variant={permissions.badgeVariant}>{permissions.badgeLabel}</Badge>
          </div>

          {selected.length >= maxOrganizations && permissions.canCompare && customerTier !== "PREMIUM_CUSTOMER" && (
            <p className="text-xs text-muted-foreground">
              Reached maximum limit of {maxOrganizations} organizations for {permissions.badgeLabel} tier.
            </p>
          )}

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
                  !permissions.canCompare ||
                  (!checked && selected.length >= maxOrganizations);

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
            {COMPARISON_CRITERIA.map((criterion) => (
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

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleCompare}
              loading={compare.isPending}
              disabled={!permissions.canCompare || selected.length < 2 || criteria.length === 0}
            >
              <ScaleIcon />
              {compare.isPending ? "Comparing" : "Compare"}
            </Button>

            {compare.data && permissions.canExportComparison && (
              <Button
                variant="outline"
                onClick={handleExportCsv}
              >
                <DownloadIcon />
                Export CSV (Premium)
              </Button>
            )}
          </div>
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
