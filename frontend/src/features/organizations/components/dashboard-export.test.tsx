import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { downloadCsv } from "@/lib/csv";
import type { Organization, OrganizationDashboard } from "@/types";

import { DashboardExportButton } from "./dashboard-export";

/**
 * Business-metric export, docs/02:126 ("Exportable business metrics").
 */

const state = {
  isPending: false,
  isError: false,
  data: null as OrganizationDashboard | null,
};

vi.mock("../api/use-dashboard", () => ({
  useOrganizationDashboard: () => ({
    data: state.data,
    isPending: state.isPending,
    isError: state.isError,
  }),
}));

vi.mock("@/lib/csv", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/csv")>();
  // `toCsv` stays real so the assertion covers the file's actual contents.
  return { ...actual, downloadCsv: vi.fn() };
});

const organization: Organization = {
  id: "org-1",
  name: "ABC Technology",
  description: null,
  industry_id: null,
  location: "Addis Ababa",
  phone: null,
  website: null,
  verification_status: "VERIFIED",
  rating: 4,
  created_at: "2026-01-01T00:00:00.000Z",
};

const dashboard: OrganizationDashboard = {
  profile_views: 12,
  reviews: 7,
  rating_trends: [
    { period: "2026-01", average: 4.5 },
    { period: "2026-02", average: 4.2 },
  ],
  customer_sentiment: { positive: 63, negative: 37 },
  competitor_position: [
    { organization_id: "peer-1", rank: 1, organization_name: "Peer One" },
    { organization_id: "org-1", rank: 2, organization_name: "ABC Technology" },
  ],
};

beforeEach(() => {
  state.isPending = false;
  state.isError = false;
  state.data = dashboard;
  vi.mocked(downloadCsv).mockClear();
});

describe("readiness", () => {
  it("stays disabled until the metrics it reports have arrived", () => {
    state.data = null;
    state.isPending = true;

    render(<DashboardExportButton organization={organization} />);

    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });

  it("stays disabled when the dashboard could not be read", () => {
    state.data = null;
    state.isError = true;

    render(<DashboardExportButton organization={organization} />);

    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });
});

describe("exporting", () => {
  it("writes the tiles, the sentiment split and the trend as one table", async () => {
    const user = userEvent.setup();

    render(<DashboardExportButton organization={organization} />);
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(downloadCsv).toHaveBeenCalledTimes(1);

    const [filename, csv] = vi.mocked(downloadCsv).mock.calls[0];
    expect(filename).toMatch(/^analytics-abc-technology-\d{4}-\d{2}-\d{2}\.csv$/);

    expect(csv).toContain("Section,Metric,Value,Note");
    expect(csv).toContain("summary,reviews,7");
    expect(csv).toContain("summary,industry_rank,2,of 2 peers");
    expect(csv).toContain("summary,peer_count,2");
    expect(csv).toContain("sentiment,positive_percent,63");
    expect(csv).toContain("sentiment,negative_percent,37");
    expect(csv).toContain("rating_trend,2026-01,4.5");
    expect(csv).toContain("rating_trend,2026-02,4.2");
  });

  it("keeps the estimate label on a figure the UI does not claim to measure", async () => {
    const user = userEvent.setup();

    render(<DashboardExportButton organization={organization} />);
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    const [, csv] = vi.mocked(downloadCsv).mock.calls[0];
    expect(csv).toContain("summary,profile_views,12,Estimated");
  });

  it("reduces an organization name that a filesystem would reject", async () => {
    const user = userEvent.setup();

    render(
      <DashboardExportButton
        organization={{ ...organization, name: "ወርቅ / Sons & Daughters (PLC)" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    const [filename] = vi.mocked(downloadCsv).mock.calls[0];
    expect(filename).toMatch(/^analytics-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(filename).not.toContain("/");
  });

  it("exports the metrics it has, without sentiment it does not invent", async () => {
    const user = userEvent.setup();
    state.data = { profile_views: 3, reviews: 1 };

    render(<DashboardExportButton organization={organization} />);
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    const [, csv] = vi.mocked(downloadCsv).mock.calls[0];
    expect(csv).toContain("summary,profile_views,3,Estimated");
    expect(csv).not.toContain("sentiment,");
    expect(csv).not.toContain("rating_trend,");
  });
});
