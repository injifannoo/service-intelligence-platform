/**
 * CSV encoding for client-side exports.
 *
 * docs/02:126 requires exportable business metrics and administrative audit
 * logs, but docs/05_API_Design.md documents no export endpoint and docs/04 no
 * export table, so the file is assembled in the browser from data the page has
 * already loaded. Nothing here reaches the network.
 */

/**
 * Prefixes a spreadsheet will evaluate as a formula rather than store as text.
 *
 * `docs/02:126` makes audit logs exportable, and audit rows carry resource ids
 * and actor names that originate elsewhere. A leading apostrophe is the OWASP
 * mitigation for CSV injection: Excel strips it on display, so an honest value
 * reads unchanged while `=cmd|...` is stored inert.
 */
const FORMULA_PREFIXES = ["=", "+", "@", "-", "\t", "\r"];

const NEEDS_QUOTING = /[",\n\r]/;

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  const text = String(value);
  const guarded =
    typeof value === "string" &&
    FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix))
      ? `'${text}`
      : text;

  return NEEDS_QUOTING.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

/**
 * Encode a rectangular table as CSV.
 *
 * CRLF line endings and a UTF-8 byte-order mark, which is what a spreadsheet
 * needs to decode non-Latin text: reviews and organization names in this
 * product are not guaranteed to be ASCII.
 */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/**
 * Hand the file to the browser's download path.
 *
 * The object URL is revoked immediately after the click: Chrome and Firefox
 * resolve `download` synchronously, so holding the blob alive would leak it for
 * the lifetime of the document.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

/** `2026-10-08` — stable across locales so filenames sort. */
export function dateStamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
