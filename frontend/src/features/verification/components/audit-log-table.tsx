"use client";

import { useState } from "react";
import { DownloadIcon, ScrollTextIcon } from "lucide-react";
import { AlertMessage } from "@/components/shared/alert-message";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dateStamp, downloadCsv, toCsv } from "@/lib/csv";
import type { AuditLog } from "@/types";

import { verificationApi } from "../api/get-verification";
import { useAuditLogs } from "../api/use-verification";

/** docs/02:126 makes administrative audit logs exportable. */
const CSV_HEADERS = ["When", "Action", "Actor", "Resource"] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

/**
 * One export row.
 *
 * `timestamp` is written raw rather than through `formatDate`: a spreadsheet
 * sorts an ISO 8601 value chronologically, where a locale string sorts by the
 * day's text. The actor falls back to the id because `user_name` is an optional
 * dev-backend addition (see `AuditLog`).
 */
function toCsvRow(log: AuditLog): (string | null)[] {
  return [log.timestamp, log.action, log.user_name ?? log.user_id, log.resource_id];
}

/**
 * Audit log table.
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION — see `api/get-verification.ts`.
 * `docs/04:628` declares no primary key for `audit_logs`, so rows are keyed on
 * the position within the page.
 */
export function AuditLogTable({ enabled }: { enabled: boolean }) {
  const query = useAuditLogs(enabled);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState<string | null>(null);

  if (!enabled) return null;

  if (query.isPending) {
    return <Skeleton className="h-48" />;
  }

  if (query.isError) {
    return (
      <AlertMessage tone="error">
        {query.error instanceof Error
          ? query.error.message
          : "Failed to load audit logs."}
      </AlertMessage>
    );
  }

  const logs = query.data?.data ?? [];
  const total = query.data?.pagination?.count ?? logs.length;

  // Declared after the returns above because a hook would have to sit before
  // them, and this handler is not one.
  async function handleExport() {
    setExporting(true);
    setExportError(null);
    setTruncated(null);

    try {
      const { rows, total: full } = await verificationApi.listAllAuditLogs();
      downloadCsv(`audit-log-${dateStamp()}.csv`, toCsv(CSV_HEADERS, rows.map(toCsvRow)));
      if (rows.length < full) setTruncated(`${rows.length} of ${full}`);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Could not export the audit log.",
      );
    } finally {
      setExporting(false);
    }
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
        <ScrollTextIcon className="size-7 text-muted-foreground" />
        <p className="text-sm font-medium">No audit entries</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total === 1 ? "1 entry" : `${total} entries`}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          loading={exporting}
          disabled={exporting}
        >
          <DownloadIcon />
          {exporting ? "Exporting" : "Export CSV"}
        </Button>
      </div>

      {exportError && <AlertMessage tone="error">{exportError}</AlertMessage>}
      {truncated && (
        <AlertMessage tone="warning" title="Partial export">
          Exported {truncated} entries; older entries were not included.
        </AlertMessage>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log, index) => (
              <TableRow key={log.id ?? index}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(log.timestamp)}
                </TableCell>
                <TableCell className="font-mono text-xs">{log.action}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.resource_id ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
