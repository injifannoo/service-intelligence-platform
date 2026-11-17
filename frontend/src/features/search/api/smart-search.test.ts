import { describe, expect, it } from "vitest";

import { rank, type Intent, type Rankable } from "@/lib/search";

import { interpretLocally, smartRank } from "./smart-search";

const org = (overrides: Partial<Rankable> & Pick<Rankable, "name">): Rankable => ({
  tagline: "",
  category: "Software Development",
  services: [],
  industries: [],
  priceTier: 2,
  responseHours: 24,
  verified: false,
  trustScore: 60,
  rating: 4,
  sentiment: { positive: 70 },
  ...overrides,
});

const intent = (overrides: Partial<Intent> = {}): Intent => ({
  raw: "",
  keywords: [],
  industries: [],
  categories: [],
  fastResponse: false,
  verifiedOnly: false,
  ...overrides,
});

describe("interpretLocally", () => {
  it("drops stop words and short tokens from keywords", () => {
    const result = interpretLocally("Find the company for a website");

    expect(result.keywords).toEqual(["website", "web", "platform"]);
    expect(result.raw).toBe("Find the company for a website");
  });

  it("expands known synonyms into additional keywords", () => {
    const result = interpretLocally("hacker");

    expect(result.keywords).toEqual(["hacker", "security", "pentest"]);
    expect(result.categories).toContain("Cybersecurity");
  });

  it("extracts budget, industry and category intent", () => {
    const result = interpretLocally("affordable mobile app for a fintech startup");

    expect(result.budget).toBe(1);
    expect(result.categories).toContain("Mobile Apps");
    expect(result.industries).toEqual(expect.arrayContaining(["fintech", "startups"]));
    expect(result.keywords).toEqual(
      expect.arrayContaining(["affordable", "mobile", "app", "fintech", "startup"]),
    );
    expect(result.keywords).not.toContain("for");
    expect(result.keywords).not.toContain("a");
  });

  it("detects urgency and verified-only intent", () => {
    const result = interpretLocally("urgent verified cybersecurity audit");

    expect(result.fastResponse).toBe(true);
    expect(result.verifiedOnly).toBe(true);
    expect(result.categories).toContain("Cybersecurity");
  });

  it("does not invent a budget when none is stated", () => {
    expect(interpretLocally("custom software team").budget).toBeUndefined();
  });

  it("returns a stable result for an empty query", () => {
    expect(interpretLocally("")).toMatchObject({
      raw: "",
      keywords: [],
      industries: [],
      categories: [],
      fastResponse: false,
      verifiedOnly: false,
    });
  });
});

describe("smartRank", () => {
  const software = org({
    name: "Alpha Software",
    category: "Software Development",
    services: ["Web platforms"],
    trustScore: 62,
    rating: 4.1,
  });
  const mobile = org({
    name: "Beta Mobile",
    category: "Mobile Apps",
    services: ["Flutter apps"],
    trustScore: 96,
    rating: 5,
  });

  it("keeps the base ranking when there are no keywords", () => {
    const organisations = [software, mobile];
    const base = rank(intent(), organisations);
    const smart = smartRank(intent(), organisations);

    expect(smart.map((result) => result.org.name)).toEqual(base.map((result) => result.org.name));
    expect(smart[0].org).toBe(mobile);
  });

  it("tolerates a typo and surfaces the matching provider", () => {
    const results = smartRank(
      intent({ raw: "softwre", keywords: ["softwre"] }),
      [software, mobile],
    );

    expect(results[0].org).toBe(software);
    expect(results[0].reasons.some((reason) => reason.startsWith("Matches "))).toBe(true);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("boosts a category match above a stronger general score", () => {
    const cyber = org({
      name: "Gamma Security",
      category: "Cybersecurity",
      services: ["Penetration testing"],
      trustScore: 55,
      rating: 3.9,
    });

    const results = smartRank(intent({ keywords: ["security"] }), [mobile, cyber]);

    expect(results[0].org).toBe(cyber);
    expect(results[0].reasons.some((reason) => reason.startsWith("Matches "))).toBe(true);
  });

  it("leaves non-matching providers on their base score", () => {
    const query = intent({ keywords: ["web"] });
    const base = rank(query, [software, mobile]);
    const results = smartRank(query, [software, mobile]);

    const mobileBase = base.find((result) => result.org === mobile)!;
    const mobileSmart = results.find((result) => result.org === mobile)!;
    const softwareSmart = results.find((result) => result.org === software)!;

    expect(mobileSmart.score).toBe(mobileBase.score);
    expect(mobileSmart.reasons).toEqual(mobileBase.reasons);
    expect(softwareSmart.score).toBeGreaterThan(
      base.find((result) => result.org === software)!.score,
    );
  });

  it("applies filters already encoded in the intent", () => {
    const results = smartRank(
      intent({ categories: ["Mobile Apps"], industries: ["fintech"] }),
      [software, mobile],
    );

    expect(results[0].org).toBe(mobile);
    expect(results[0].reasons.some((reason) => reason.includes("Specializes in Mobile Apps"))).toBe(
      true,
    );
  });

  it("returns an empty list for an empty provider list", () => {
    expect(smartRank(intent({ keywords: ["web"] }), [])).toEqual([]);
  });
});
