import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dateStamp, downloadCsv, toCsv } from "./csv";

/**
 * CSV export primitives for docs/02:126 ("Exportable business metrics,
 * administrative audit logs").
 */

/** The BOM every assertion has to look past. */
const BOM = "\uFEFF";

describe("toCsv", () => {
  it("writes a header and one CRLF-terminated line per row", () => {
    expect(toCsv(["When", "Action"], [["2026-01-01T00:00:00Z", "review.created"]])).toBe(
      `${BOM}When,Action\r\n2026-01-01T00:00:00Z,review.created\r\n`,
    );
  });

  it("carries a byte-order mark so a spreadsheet reads UTF-8", () => {
    // Without it a spreadsheet falls back to the system codepage and mangles
    // any non-Latin organization or user name.
    expect(toCsv(["Name"], [["ወርቅ"]]).charCodeAt(0)).toBe(BOM.charCodeAt(0));
  });

  it("quotes cells containing a comma", () => {
    expect(toCsv(["Name"], [["Addis Ababa, Ethiopia"]])).toBe(
      `${BOM}Name\r\n"Addis Ababa, Ethiopia"\r\n`,
    );
  });

  it("escapes a doubled quote", () => {
    expect(toCsv(["Note"], [['said "no"']])).toBe(`${BOM}Note\r\n"said ""no"""\r\n`);
  });

  it("keeps an embedded newline inside the cell", () => {
    expect(toCsv(["Note"], [["line one\nline two"]])).toBe(
      `${BOM}Note\r\n"line one\nline two"\r\n`,
    );
  });

  it("writes nothing for a null or undefined cell", () => {
    // A missing value must stay distinguishable from the literal text "null".
    expect(toCsv(["a", "b"], [[null, undefined]])).toBe(`${BOM}a,b\r\n,\r\n`);
  });

  it("neutralises a cell a spreadsheet would evaluate", () => {
    for (const payload of ["=1+1", "+1", "@SUM(A1)", "-2+3"]) {
      expect(toCsv(["v"], [[payload]])).toContain(`'${payload}`);
    }
  });

  it("leaves numbers alone", () => {
    // The guard is for text that arrives from elsewhere; a negative number
    // passed as a number would be corrupted by an apostrophe.
    expect(toCsv(["value"], [[-5]])).toBe(`${BOM}value\r\n-5\r\n`);
  });

  it("encodes a row shorter or longer than the header without throwing", () => {
    expect(toCsv(["a", "b"], [["only"]])).toBe(`${BOM}a,b\r\nonly\r\n`);
    expect(toCsv(["a"], [["x", "y"]])).toBe(`${BOM}a\r\nx,y\r\n`);
  });
});

describe("dateStamp", () => {
  it("is a sortable, locale-independent date", () => {
    expect(dateStamp(new Date(2026, 9, 8))).toBe("2026-10-08");
    expect(dateStamp(new Date(2026, 0, 3))).toBe("2026-01-03");
  });
});

describe("downloadCsv", () => {
  let created: string[];
  let revoked: string[];
  let clicked: string[];

  // jsdom implements neither of these, so they are installed rather than
  // spied: `vi.spyOn` refuses to wrap a method that is not there.
  const url = URL as unknown as Record<string, unknown>;
  const hadCreateObjectURL = "createObjectURL" in url;
  const hadRevokeObjectURL = "revokeObjectURL" in url;

  beforeEach(() => {
    created = [];
    revoked = [];
    clicked = [];

    url.createObjectURL = (blob: Blob) => {
      created.push(blob.type);
      return "blob:mock";
    };
    url.revokeObjectURL = (value: string) => {
      revoked.push(value);
    };
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });
  });

  afterEach(() => {
    if (!hadCreateObjectURL) delete url.createObjectURL;
    if (!hadRevokeObjectURL) delete url.revokeObjectURL;
    vi.restoreAllMocks();
  });

  it("offers the file with a text/csv blob and releases the URL", () => {
    downloadCsv("audit-log.csv", `${BOM}a\r\n1\r\n`);

    expect(created).toEqual(["text/csv;charset=utf-8"]);
    expect(clicked).toEqual(["audit-log.csv"]);
    expect(revoked).toEqual(["blob:mock"]);
    // The anchor is a download vehicle; leaving it in the document would leak
    // a node with a blob URL on every export.
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
