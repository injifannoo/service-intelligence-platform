"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dateStamp, downloadCsv, toCsv } from "@/lib/csv";
import type { Organization, OrganizationDashboard } from "@/types";

import { useOrganizationDashboard } from "../api/use-dashboard";

/** docs/02:126: "Exportable business metrics". */
const CSV_HEADERS = ["Section", "Metric", "Value", "Note"] as const;

type CsvRow = [string, string, string | number, string?];

/**
 * Flatten the dashboard into one table.
 *
 * A CSV holds a single rectangular table, so the tiles, the sentiment split and
 * the monthly trend are distinguished by a `Section` column rather than being
 * forced into columns they do not share. The dashboard is consumed as a whole,
 * so nothing is re-fetched to build the file.
 */
function buildRows(
  dashboard: OrganizationDashboard,
  organization: Organization,
): CsvRow[] {
  const competitors = dashboard.competitor_position ?? [];
  const rankIndex = competitors.findIndex(
    (entry) => entry.organization_id === organization.id,
  );

  const rows: CsvRow[] = [
    // The tile is labelled "Estimated" in the UI because there is no analytics
    // pipeline behind it; dropping that here would present it as measured.
    ["summary", "profile_views", dashboard.profile_views ?? 0, "Estimated"],
    ["summary", "reviews", dashboard.reviews ?? 0],
    [
      "summary",
      "industry_rank",
      rankIndex >= 0 ? rankIndex + 1 : "",
      competitors.length > 0 ? `of ${competitors.length} peers` : "",
    ],
    ["summary", "peer_count", competitors.length],
  ];

  const sentiment = dashboard.customer_sentiment;
  if (sentiment) {
    rows.push(["sentiment", "positive_percent", sentiment.positive]);
    rows.push(["sentiment", "negative_percent", sentiment.negative]);
  }

  for (const trend of dashboard.rating_trends ?? []) {
    rows.push(["rating_trend", trend.period, trend.average]);
  }

  return rows;
}

/** Organization names are user-entered, so they are reduced before a filename. */
function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "organization"
  );
}

/**
 * Export button for the owner dashboard.
 *
 * Placed in the page header rather than inside the panel so it is visible while
 * the panel is still a skeleton, and disabled until the payload it reports is
 * actually in hand.
 */
export function DashboardExportButton({ organization }: { organization: Organization }) {
  const { data, isPending, isError } = useOrganizationDashboard(organization.id);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    if (!data) return;

    setExporting(true);
    setError(null);

    try {
      const csv = toCsv(CSV_HEADERS, buildRows(data, organization));
      downloadCsv(`analytics-${slug(organization.name)}-${dateStamp()}.csv`, csv);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not export the metrics.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        loading={exporting}
        disabled={exporting || isPending || isError || !data}
      >
        <DownloadIcon />
        {exporting ? "Exporting" : "Export CSV"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
