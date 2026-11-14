import type { ReactNode } from "react";

export type Column<T> = { key: string; header: string; render: (row: T) => ReactNode };

export function DataTable<T>({ rows, columns, rowKey, empty = "No data" }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; empty?: string }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left">{columns.map((c) => <th key={c.key} className="p-3 font-medium text-muted-foreground">{c.header}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={rowKey(r)} className="border-b last:border-0">{columns.map((c) => <td key={c.key} className="p-3">{c.render(r)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
