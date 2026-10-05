"use client";

import { ScrollTextIcon } from "lucide-react";
import { AlertMessage } from "@/components/shared/alert-message";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuditLogs } from "../api/use-verification";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
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

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
        <ScrollTextIcon className="size-7 text-muted-foreground" />
        <p className="text-sm font-medium">No audit entries</p>
      </div>
    );
  }

  return (
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
  );
}
