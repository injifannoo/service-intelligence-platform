"use client";

import { LayersIcon, ShieldCheckIcon, TrendingUpIcon, UsersIcon } from "lucide-react";

import { PHASE_ONE_INDUSTRIES } from "@/config/site-config";
import { useOrganizations } from "@/features/organizations";

/**
 * Trust and coverage strip with clean metrics display.
 *
 * Figures are read from the live directory, showing real platform data.
 */
export function MetricsStrip() {
  const { data, isPending, isError } = useOrganizations({ page_size: 100 });

  const organizations = data?.data ?? [];
  const total = data?.pagination?.count ?? organizations.length;
  const verified = organizations.filter(
    (organization) => organization.verification_status === "VERIFIED",
  ).length;

  const loading = isPending && !isError;

  const metrics = [
    {
      icon: UsersIcon,
      value: loading ? "—" : `${total}`,
      label: "Providers",
    },
    {
      icon: ShieldCheckIcon,
      value: loading ? "—" : `${verified}`,
      label: "Verified",
    },
    {
      icon: LayersIcon,
      value: `${PHASE_ONE_INDUSTRIES.length}`,
      label: "Categories",
    },
    {
      icon: TrendingUpIcon,
      value: "AI-Powered",
      label: "Intelligence",
    },
  ] as const;

  return (
    <section className="border-b border-border bg-secondary">
      <div className="mx-auto w-full max-w-7xl px-6 py-6">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center justify-center gap-3 text-center sm:justify-start sm:text-left"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
                <metric.icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <dt className="text-lg leading-none font-bold tabular-nums text-foreground">
                  {metric.value}
                </dt>
                <dd className="mt-0.5 text-xs font-medium text-muted-foreground">{metric.label}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
