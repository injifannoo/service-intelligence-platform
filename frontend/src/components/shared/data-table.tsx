"use client";

import type { ReactNode } from "react";
import { ArrowUpDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Domain-agnostic table primitive.
 *
 * Deliberately unopinionated: no knowledge of organizations, tenants, or AI
 * state, per docs/07_Project_Structure.md:225. Feature slices compose their own
 * columns on top of this.
 */
export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
  emptyMessage?: string;
  sort?: { key: string; direction: "asc" | "desc" };
  onSortChange?: (key: string) => void;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  emptyMessage = "No results.",
  sort,
  onSortChange,
  page,
  pageSize,
  totalCount,
  onPageChange,
}: DataTableProps<T>) {
  const totalPages =
    page !== undefined && pageSize !== undefined && pageSize > 0
      ? Math.max(1, Math.ceil((totalCount ?? rows.length) / pageSize))
      : null;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sort?.key === column.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(
                    "px-4 py-3 text-left font-medium",
                    column.className,
                  )}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {column.header}
                      {sort?.key === column.key && (
                        <span aria-hidden="true" className="text-xs">
                          {sort.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                      {sort?.key !== column.key && (
                        <ArrowUpDownIcon className="size-3" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-t border-border hover:bg-muted/30"
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-4 py-3", column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages !== null && onPageChange && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={(page ?? 1) <= 1}
            onClick={() => onPageChange((page ?? 1) - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={(page ?? 1) >= totalPages}
            onClick={() => onPageChange((page ?? 1) + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}
