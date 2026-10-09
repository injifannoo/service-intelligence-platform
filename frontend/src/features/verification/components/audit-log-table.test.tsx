import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { downloadCsv } from "@/lib/csv";
import type { AuditLog } from "@/types";

import { verificationApi } from "../api/get-verification";
import { AuditLogTable } from "./audit-log-table";

/**
 * Audit log export, docs/02:126 ("administrative audit logs" among the
 * exportable reporting data).
 */

const state = {
  isPending: false,
  isError: false,
  error: null as unknown,
  data: [] as AuditLog[],
  count: 0,
};

vi.mock("../api/use-verification", () => ({
  useAuditLogs: () => ({
    data: {
      data: state.data,
      pagination: { count: state.count, next: null, previous: null, page_size: 100 },
    },
    isPending: state.isPending,
    isError: state.isError,
    error: state.error,
  }),
}));

vi.mock("../api/get-verification", () => ({
  verificationApi: { listAllAuditLogs: vi.fn() },
}));

vi.mock("@/lib/csv", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/csv")>();
  // `toCsv` stays real so the assertion covers the file's actual contents.
  return { ...actual, downloadCsv: vi.fn() };
});

function log(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: "log-1",
    user_id: "user-1",
    action: "review.created",
    resource_id: "review-1",
    timestamp: "2026-01-05T10:00:00.000Z",
    user_name: "Ada Lovelace",
    ...overrides,
  };
}

beforeEach(() => {
  state.isPending = false;
  state.isError = false;
  state.error = null;
  state.data = [];
  state.count = 0;
  vi.mocked(verificationApi.listAllAuditLogs).mockReset();
  vi.mocked(downloadCsv).mockClear();
});

describe("reading the log", () => {
  it("shows the true entry count, not just the page length", () => {
    state.data = [log()];
    state.count = 38;

    render(<AuditLogTable enabled />);

    expect(screen.getByText("38 entries")).toBeDefined();
    expect(screen.getByText("review.created")).toBeDefined();
  });

  it("waits for the first page instead of reporting an empty log", () => {
    state.isPending = true;

    const { container } = render(<AuditLogTable enabled />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByText("No audit entries")).toBeNull();
    expect(screen.queryByRole("button", { name: /Export CSV/ })).toBeNull();
  });

  it("says so when there is nothing to export", () => {
    render(<AuditLogTable enabled />);

    expect(screen.getByText("No audit entries")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Export CSV/ })).toBeNull();
  });

  it("renders nothing before the role is known", () => {
    const { container } = render(<AuditLogTable enabled={false} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("exporting", () => {
  it("walks every page and writes the whole log to the file", async () => {
    const user = userEvent.setup();
    state.data = [log()];
    state.count = 1000;

    const all = Array.from({ length: 1000 }, (_, index) =>
      log({
        id: `log-${index}`,
        action: `action.${index}`,
        user_name: index % 2 === 0 ? "Ada Lovelace" : undefined,
      }),
    );
    vi.mocked(verificationApi.listAllAuditLogs).mockResolvedValue({ rows: all, total: 1000 });

    render(<AuditLogTable enabled />);
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    await waitFor(() => {
      expect(downloadCsv).toHaveBeenCalledTimes(1);
    });

    expect(verificationApi.listAllAuditLogs).toHaveBeenCalledTimes(1);

    const [filename, csv] = vi.mocked(downloadCsv).mock.calls[0];
    expect(filename).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv).toContain("When,Action,Actor,Resource");
    // The whole log, not the one page the table shows.
    expect(csv.trim().split("\r\n")).toHaveLength(1001);
    // ISO 8601, so a spreadsheet sorts it chronologically.
    expect(csv).toContain("2026-01-05T10:00:00.000Z");
    // `user_name` is optional; the id is the fallback.
    expect(csv).toContain("Ada Lovelace");
    expect(csv).toContain("user-1");
  });

  it("warns when the export stopped short of the real total", async () => {
    const user = userEvent.setup();
    state.data = [log()];
    state.count = 5000;
    vi.mocked(verificationApi.listAllAuditLogs).mockResolvedValue({ rows: [log(), log()], total: 5000 });

    render(<AuditLogTable enabled />);
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(await screen.findByText("Partial export")).toBeDefined();
    expect(screen.getByText(/Exported 2 of 5000 entries/)).toBeDefined();
    // A capped export must not look complete.
    expect(downloadCsv).toHaveBeenCalledTimes(1);
  });

  it("reports a failed export without discarding the log", async () => {
    const user = userEvent.setup();
    state.data = [log()];
    state.count = 1;
    vi.mocked(verificationApi.listAllAuditLogs).mockRejectedValue(new Error("Network unreachable"));

    render(<AuditLogTable enabled />);
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(await screen.findByText("Network unreachable")).toBeDefined();
    expect(screen.getByText("review.created")).toBeDefined();
    expect(downloadCsv).not.toHaveBeenCalled();
  });

  it("is disabled while an export is in flight", async () => {
    const user = userEvent.setup();
    state.data = [log()];
    state.count = 1;
    let resolve: (value: { rows: AuditLog[]; total: number }) => void = () => {};
    vi.mocked(verificationApi.listAllAuditLogs).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    render(<AuditLogTable enabled />);
    const button = screen.getByRole("button", { name: "Export CSV" });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Exporting/ })).toBeDisabled();
    });

    resolve({ rows: [log()], total: 1 });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();
    });
  });
});
