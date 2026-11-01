"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  CrownIcon,
  EyeIcon,
  LockIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { BarChart, SplitBar } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getOrgDashboardPermissions,
  getOrgTier,
} from "@/features/authentication";
import type { Organization, OrganizationTier } from "@/types";
import { ORGANIZATION_TIERS, ORGANIZATION_TIER_LABELS } from "@/types";

import { useOrganizationDashboard } from "../api/use-dashboard";
import { DashboardExportButton } from "./dashboard-export";

/**
 * Owner analytics dashboard.
 *
 * Blueprint §5 — 3 org tiers: Registered, Verified, Premium (different dashboard features).
 */
export function OrganizationDashboardPanel({ organization }: { organization: Organization }) {
  const { data, isPending, isError } = useOrganizationDashboard(organization.id);
  const initialTier = getOrgTier(organization);
  const [activeTier, setActiveTier] = useState<OrganizationTier>(initialTier);

  const permissions = getOrgDashboardPermissions(activeTier);

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

  const competitors = data?.competitor_position ?? [];
  const competitorIds = competitors.map((entry) => entry.organization_id);

  return (
    <div className="space-y-6">
      {/* Blueprint §5 Organization Tier Indicator & Interactive Simulator */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Blueprint §5 Org Tier:
              </span>
              <Badge variant={permissions.tierVariant} className="px-2.5 py-0.5 font-medium">
                {activeTier === "PREMIUM" && <CrownIcon className="mr-1 size-3" />}
                {activeTier === "VERIFIED" && <ShieldCheckIcon className="mr-1 size-3" />}
                {permissions.tierLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {permissions.description}
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background p-1">
            <span className="px-2 text-xs font-medium text-muted-foreground">Demo Tier:</span>
            {ORGANIZATION_TIERS.map((tier) => (
              <Button
                key={tier}
                size="sm"
                variant={activeTier === tier ? "default" : "ghost"}
                className="h-7 px-2.5 text-xs"
                onClick={() => setActiveTier(tier)}
              >
                {ORGANIZATION_TIER_LABELS[tier]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customer sentiment feature — Unlocked for Verified and Premium */}
      {permissions.canViewSentiment ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Customer sentiment</CardTitle>
              <Badge variant="success">Verified & Premium</Badge>
            </div>
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
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <LockIcon className="size-4" aria-hidden="true" />
                Customer sentiment (Locked)
              </CardTitle>
              <Badge variant="outline">Verified & Premium</Badge>
            </div>
            <CardDescription>
              Lexicon classification of review text, split by polarity.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Customer sentiment polarity breakdown is locked on the <strong>Registered Org</strong> tier. Verify your business documents to unlock customer sentiment metrics.
          </CardContent>
        </Card>
      )}

      {/* Stat Tiles: Profile views, Reviews, Industry rank */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={EyeIcon}
          label="Profile views"
          value={data?.profile_views ?? 0}
          hint="Estimated"
        />
        <StatTile icon={MessageSquareIcon} label="Reviews" value={data?.reviews ?? 0} />
        {permissions.canViewCompetitorRank ? (
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
        ) : (
          <StatTile
            icon={LockIcon}
            label="Industry rank"
            value="Locked"
            hint="Premium Org feature"
          />
        )}
      </div>

      {/* Rating trend feature — Unlocked for Verified and Premium */}
      {permissions.canViewRatingTrends ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Rating trend</CardTitle>
              <Badge variant="success">Verified & Premium</Badge>
            </div>
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
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <LockIcon className="size-4" aria-hidden="true" />
                Rating trend (Locked)
              </CardTitle>
              <Badge variant="outline">Verified & Premium</Badge>
            </div>
            <CardDescription>Average rating per calendar month.</CardDescription>
          </CardHeader>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Monthly rating trends and historical analytics are available for <strong>Verified</strong> and <strong>Premium</strong> organizations.
          </CardContent>
        </Card>
      )}

      {/* Competitive position feature — Unlocked for Premium only */}
      {permissions.canViewCompetitorRank ? (
        competitorIds.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CrownIcon className="size-4 text-amber-500" aria-hidden="true" />
                  Competitive position
                </CardTitle>
                <Badge variant="accent">Premium Org Feature</Badge>
              </div>
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
        )
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <LockIcon className="size-4" aria-hidden="true" />
                Competitive position & Peer ranking (Locked)
              </CardTitle>
              <Badge variant="accent">Premium Org Only</Badge>
            </div>
            <CardDescription>
              Rankings and peer benchmarks against other organizations in the same industry.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Industry competitive rank and peer benchmarking are exclusive to the <strong>Premium Org</strong> tier.
          </CardContent>
        </Card>
      )}

      {/* Premium AI Strategic Insights — Unlocked for Premium only */}
      {permissions.canAccessAiInsights && (
        <Card className="border-purple-200 bg-purple-50/30 dark:border-purple-900 dark:bg-purple-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                <SparklesIcon className="size-4" aria-hidden="true" />
                AI Strategic Insights
              </CardTitle>
              <Badge variant="accent">Premium Org Feature</Badge>
            </div>
            <CardDescription>
              Automated AI recommendations based on customer sentiment and competitive trends.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium text-foreground">Recommendations for growth:</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Address customer turnaround times during peak discovery phases.</li>
              <li>Highlight verified client testimonials on engineering modernisations.</li>
              <li>Your responsiveness rating is in the top 15% of peers in your industry.</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Export Section */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">Metrics Export</p>
          <p className="text-xs text-muted-foreground">
            {permissions.canExportDashboard
              ? "Download your analytics report as a CSV spreadsheet."
              : "Exporting analytics data requires a Premium Organization tier."}
          </p>
        </div>
        {permissions.canExportDashboard ? (
          <DashboardExportButton organization={organization} />
        ) : (
          <Button size="sm" variant="outline" disabled>
            <LockIcon aria-hidden="true" />
            Export CSV (Premium)
          </Button>
        )}
      </div>
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
