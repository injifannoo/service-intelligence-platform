"use client";

import { LayersIcon, ShieldCheckIcon, TrendingUpIcon, UsersIcon } from "lucide-react";

import { PHASE_ONE_INDUSTRIES } from "@/config/site-config";
import { useOrganizations } from "@/features/organizations";

/**
 * Trust and coverage strip.
 *
 * Figures are read from the live directory rather than hardcoded, so the strip
 * never claims scale the platform does not have. The fourth group is a
 * capability statement, not a metric, and carries no number.
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
      label: "Service Providers",
    },
    {
      icon: ShieldCheckIcon,
      value: loading ? "—" : `${verified}`,
      label: "Verified Providers",
    },
    {
      icon: LayersIcon,
      value: `${PHASE_ONE_INDUSTRIES.length}`,
      label: "Service Categories",
    },
    {
      icon: TrendingUpIcon,
      value: "Smarter Decisions",
      label: "for a Better Tomorrow",
    },
  ] as const;

  return (
    <section className="border-b border-border bg-[#F5FAFF]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:flex sm:items-center sm:gap-8">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={
                index > 0
                  ? "flex items-center gap-3 sm:border-l sm:border-border sm:pl-8"
                  : "flex items-center gap-3"
              }
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EEF7FF] text-primary">
                <metric.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <dt className="text-lg leading-none font-bold text-foreground">
                  {metric.value}
                </dt>
                <dd className="mt-1 text-xs text-muted-foreground">{metric.label}</dd>
              </div>
            </div>
          ))}
        </dl>

        <p className="text-xs text-muted-foreground sm:max-w-xs sm:text-right">
          Live figures from the ASIP directory. Coverage grows as more industries
          and providers come online.
        </p>
      </div>
    </section>
  );
}
