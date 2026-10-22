"use client";

import { AlertTriangleIcon, EyeIcon, MessageSquareIcon, TrophyIcon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { BarChart, SplitBar } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Organization } from "@/types";

import { useOrganizationDashboard } from "../api/use-dashboard";

/**
 * Owner analytics dashboard.
 *
 * MVP Version 2 (docs/08_Development_Roadmap.md:416-426). Reads
 * `GET /api/v1/organizations/{id}/analytics/dashboard/`, which is owner-scoped.
 */
export function OrganizationDashboardPanel({ organization }: { organization: Organization }) {
  const { data, isPending, isError } = useOrganizationDashboard(organization.id);

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-56 lg:col-span-3" />
      </div>
    );
  }

  if (isError) {
    return (
      <AlertMessage tone="error" title="Dashboard unavailable">
        Analytics for this organization could not be loaded.
      </AlertMessage>
    );
  }

  const trends = data?.rating_trends ?? [];
  const sentiment = data?.customer_sentiment;

  // The peer set is every organisation in the same industry that is not
  // rejected, so it includes unverified ones. The badge reflects each peer's
  // actual status rather than implying the whole set is verified.
  const competitors = data?.competitor_position ?? [];
  const competitorIds = competitors.map((entry) => entry.organization_id);

  return (
    <div className="space-y-6">
      {/*
        AI customer sentiment is the platform's flagship signal, so it leads the
        dashboard rather than sitting beside the rating trend.
      */}
      <Card>
        <CardHeader>
          <CardTitle>Customer sentiment</CardTitle>
          <CardDescription>
            Lexicon classification of review text, split by polarity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sentiment ? (
            <SplitBar
              positive={sentiment.positive}
              negative={sentiment.negative}
              positiveLabel="Positive"
              negativeLabel="Negative"
            />
          ) : (
            <p className="text-sm text-muted-foreground">No sentiment data yet.</p>
          )}

          <AlertMessage tone="info">
            <span className="flex items-start gap-2">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Sentiment is keyword-based and does not interpret sarcasm or non-English
              text. Treat it as a signal, not a verdict.
            </span>
          </AlertMessage>
        </CardContent>
      </Card>

      {/*
        `profile_views` has no analytics pipeline behind it in this environment,
        so it is a stable synthetic figure. Labelled as an estimate rather than
        presented as measured traffic.
      */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={EyeIcon}
          label="Profile views"
          value={data?.profile_views ?? 0}
          hint="Estimated"
        />
        <StatTile icon={MessageSquareIcon} label="Reviews" value={data?.reviews ?? 0} />
        <StatTile
          icon={TrophyIcon}
          label="Industry rank"
          value={
            competitorIds.indexOf(organization.id) >= 0
              ? competitorIds.indexOf(organization.id) + 1
              : "—"
          }
          hint={competitorIds.length > 0 ? `of ${competitorIds.length} peers` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rating trend</CardTitle>
          <CardDescription>Average rating per calendar month.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            title="Average rating per month"
            caption="Derived from review timestamps."
            data={trends.map((trend) => ({ label: trend.period, value: trend.average }))}
            min={1}
            max={5}
            formatValue={(value) => `${value.toFixed(1)}/5`}
          />
        </CardContent>
      </Card>

      {competitorIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Competitive position</CardTitle>
            <CardDescription>
              Ranking against other organizations in the same industry. Verified peers are
              marked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {competitors.map((entry) => {
                const isSelf = entry.organization_id === organization.id;
                return (
                  <li
                    key={entry.organization_id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-6 text-sm font-semibold tabular-nums text-muted-foreground">
                        #{entry.rank}
                      </span>
                      <span className="truncate text-sm">
                        {entry.organization_name ?? organization.name}
                      </span>
                      {!isSelf && entry.verification_status === "VERIFIED" && (
                        <Badge variant="success">Verified</Badge>
                      )}
                    </span>
                    {isSelf && <Badge variant="accent">You</Badge>}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof EyeIcon;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="rounded-md bg-primary/10 p-1.5 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}
