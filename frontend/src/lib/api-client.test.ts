import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  siteConfig: { apiBaseUrl: "" },
  getSession: vi.fn(),
}));

vi.mock("@/config/site-config", () => ({ siteConfig: mocks.siteConfig }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mocks.getSession(...args),
    },
  },
}));

vi.mock("@/lib/data", () => ({
  CATEGORIES: ["Software Development", "Mobile Apps"],
  ORGS: [
    {
      slug: "alpha-labs",
      name: "Alpha Labs",
      tagline: "Web platforms for fintech teams.",
      category: "Software Development",
      services: ["Web platforms", "API development"],
      industries: ["Fintech"],
      location: "Bole, Addis Ababa",
      founded: 2015,
      size: "11-50",
      priceTier: 2,
      rating: 4.5,
      reviewCount: 12,
      trustScore: 81,
      responseHours: 8,
      verified: true,
      certifications: ["ISO 27001"],
      sentiment: { positive: 80, neutral: 15, negative: 5 },
      strengths: ["Fast delivery"],
      issues: ["Premium pricing"],
      aiSummary: "Customers praise delivery speed.",
      recommendation: "Offer a startup tier.",
      satisfactionTrend: [80, 81, 82],
      reviews: [
        {
          author: "Hana T.",
          rating: 5,
          text: "Great work.",
          date: "2026-09-12",
          verified: "purchase",
        },
      ],
    },
  ],
}));

import { ApiError, apiClient, apiListClient, usesRestBackend } from "./api-client";

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mocks.siteConfig.apiBaseUrl = "";
  mocks.getSession.mockReset();
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("usesRestBackend", () => {
  it("is false when no API base URL is configured", () => {
    expect(usesRestBackend()).toBe(false);
  });

  it("is true when an API base URL is configured", () => {
    mocks.siteConfig.apiBaseUrl = "https://api.test/api/v1";
    expect(usesRestBackend()).toBe(true);
  });
});

describe("apiClient envelope parsing", () => {
  beforeEach(() => {
    mocks.siteConfig.apiBaseUrl = "https://api.test/api/v1";
  });

  it("unwraps a success envelope", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: "1", name: "Alpha" } }));

    await expect(apiClient<{ id: string; name: string }>("/organizations/1/")).resolves.toEqual({
      id: "1",
      name: "Alpha",
    });
  });

  it("maps a paginated success envelope onto the DRF page shape", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: true,
        data: [{ id: "1" }, { id: "2" }],
        pagination: { count: 7, next: "https://api.test/api/v1/organizations/?page=2", previous: null },
      }),
    );

    await expect(apiClient("/organizations/")).resolves.toEqual({
      count: 7,
      next: "https://api.test/api/v1/organizations/?page=2",
      previous: null,
      results: [{ id: "1" }, { id: "2" }],
    });
  });

  it("returns a raw body when it is not wrapped in an envelope", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "ok", version: "1.0" }));

    await expect(apiClient("/health/")).resolves.toEqual({ status: "ok", version: "1.0" });
  });

  it("returns null when the response has no JSON body", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, 204));

    await expect(apiClient("/health/")).resolves.toBeNull();
  });
});

describe("apiClient authentication", () => {
  beforeEach(() => {
    mocks.siteConfig.apiBaseUrl = "https://api.test/api/v1";
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: {} }));
  });

  it("sends the bearer token for authenticated calls", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "token-123" } } });

    await apiClient("/users/profile/");

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("skips credentials when explicitly anonymous", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: "token-123" } } });

    await apiClient("/organizations/", {}, { authenticated: false });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBeNull();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("does not add an Authorization header without a session", async () => {
    await apiClient("/organizations/");

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBeNull();
  });
});

describe("apiClient mock fallback", () => {
  it("uses data.ts immediately when no backend URL is configured", async () => {
    const page = await apiClient<{ results: unknown[] }>("/organizations/");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(page.results).toHaveLength(1);
    expect(page.results[0]).toMatchObject({ slug: "alpha-labs", name: "Alpha Labs" });
  });

  it("maps organizations to the REST contract so downstream mappers keep working", async () => {
    const org = await apiClient<Record<string, unknown>>("/organizations/alpha-labs/");

    expect(org).toMatchObject({
      slug: "alpha-labs",
      price_tier: 2,
      services_summary: ["Web platforms", "API development"],
      status: "verified",
    });
    expect(org.reviews).toEqual([{ rating: 5, created_at: "2026-09-12", status: "published" }]);
  });

  it("derives services and categories from the mock catalogue", async () => {
    const services = await apiClient<{ results: unknown[] }>("/services/");
    const categories = await apiClient<{ results: unknown[] }>("/categories/");

    expect(services.results).toHaveLength(2);
    expect(services.results[0]).toMatchObject({
      organization: "alpha-labs",
      organization_name: "Alpha Labs",
      category_name: "Software Development",
    });
    expect(categories.results).toEqual([
      { id: "software-development", name: "Software Development", description: "" },
      { id: "mobile-apps", name: "Mobile Apps", description: "" },
    ]);
  });

  it("falls back to mock data when the network request fails", async () => {
    mocks.siteConfig.apiBaseUrl = "https://api.test/api/v1";
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));

    const page = await apiClient<{ results: unknown[] }>("/services/", {}, { authenticated: false });

    expect(page.results).toHaveLength(2);
  });

  it("falls back when the backend returns a failure envelope", async () => {
    mocks.siteConfig.apiBaseUrl = "https://api.test/api/v1";
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, error: { code: "unavailable", message: "Down" } }),
    );

    const page = await apiClient<{ results: unknown[] }>("/organizations/", {}, { authenticated: false });

    expect(page.results).toHaveLength(1);
  });
});

describe("apiClient errors", () => {
  beforeEach(() => {
    mocks.siteConfig.apiBaseUrl = "https://api.test/api/v1";
  });

  it("throws ApiError with the backend code and message when no mock exists", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, error: { code: "server_error", message: "Boom" } }, 500),
    );

    const error = await apiClient("/health/").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "server_error", message: "Boom", status: 500 });
  });

  it("falls back to http_error when the failure body has no error details", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, 503));

    await expect(apiClient("/health/")).rejects.toMatchObject({
      code: "http_error",
      message: "Request failed (503)",
      status: 503,
    });
  });

  it("returns null through the fallback for an unknown organization, then reports 404", async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, 404));

    await expect(apiClient("/organizations/missing/", {}, { authenticated: false })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("apiListClient pagination", () => {
  beforeEach(() => {
    mocks.siteConfig.apiBaseUrl = "https://api.test/api/v1";
  });

  it("collects every page and strips the base path from absolute next links", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [{ id: "1" }],
          pagination: {
            count: 2,
            next: "https://api.test/api/v1/organizations/?page=2",
            previous: null,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [{ id: "2" }],
          pagination: { count: 2, next: null, previous: null },
        }),
      );

    await expect(apiListClient("/organizations/")).resolves.toEqual([{ id: "1" }, { id: "2" }]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.test/api/v1/organizations/?page=2",
      expect.objectContaining({}),
    );
  });

  it("stops when next points at another origin", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: [{ id: "1" }],
        pagination: { count: 2, next: "https://evil.test/api/v1/organizations/?page=2", previous: null },
      }),
    );

    await expect(apiListClient("/organizations/")).resolves.toEqual([{ id: "1" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reads a bare array from the fallback without paginating", async () => {
    mocks.siteConfig.apiBaseUrl = "";

    const rows = await apiListClient("/organizations/");

    expect(rows).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
