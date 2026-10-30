import { describe, expect, it } from "vitest";

import {
  analyzeSentiment,
  buildDashboard,
  cosineSimilarity,
  matchTerms,
  organizationSearchDocument,
  recommendOrganizations,
  scorePolarity,
  semanticScore,
  stableHash,
  summarizeReviews,
  termFrequency,
  tokenize,
} from "@/lib/dev-backend/ai";
import type { Organization, Review, ReviewScores, Service } from "@/types";

/**
 * Full score set for fixtures: every dimension equal to the overall, which is
 * how a rating-only review is stored (see `fillRatings` in store.ts).
 */
function scores(rating: number): ReviewScores {
  return {
    quality: rating,
    price: rating,
    customer_service: rating,
    speed: rating,
    overall_experience: rating,
  };
}

/* -------------------------------------------------------------------------- */
/* tokenisation                                                                */
/* -------------------------------------------------------------------------- */

describe("tokenize", () => {
  it("lowercases, drops punctuation and stopwords", () => {
    expect(tokenize("The Cloud, is Great!")).toEqual(["cloud", "great"]);
  });

  it("collapses trivial inflection so plural and singular collide", () => {
    expect(tokenize("migrations")).toEqual(tokenize("migration"));
    expect(tokenize("companies")).toEqual(tokenize("company"));
  });

  it("keeps negation words, which sentiment depends on", () => {
    expect(tokenize("not good")).toContain("not");
  });

  it("drops single characters", () => {
    expect(tokenize("a b c x")).not.toContain("x");
  });
});

describe("termFrequency / cosineSimilarity", () => {
  it("counts repeats", () => {
    expect(termFrequency(["a", "a", "b"]).get("a")).toBe(2);
  });

  it("is 1 for a vector against itself", () => {
    const vector = termFrequency(tokenize("managed cloud hosting"));
    expect(cosineSimilarity(vector, vector)).toBeCloseTo(1, 5);
  });

  it("returns 0 rather than NaN for an empty query", () => {
    expect(cosineSimilarity(new Map(), termFrequency(["cloud"]))).toBe(0);
  });
});

describe("stableHash", () => {
  it("is deterministic", () => {
    expect(stableHash("org-1")).toBe(stableHash("org-1"));
  });

  it("separates different inputs", () => {
    expect(stableHash("org-1")).not.toBe(stableHash("org-2"));
  });
});

/* -------------------------------------------------------------------------- */
/* semantic search                                                             */
/* -------------------------------------------------------------------------- */

describe("semanticScore", () => {
  it("ranks a topical document above an unrelated one", () => {
    const query = "managed cloud hosting";
    const topical = "Managed VPS hosting with 99.9% uptime commitment";
    const unrelated = "Logo, palette, typography, and brand guidelines";

    expect(semanticScore(query, topical)).toBeGreaterThan(semanticScore(query, unrelated));
  });

  it("rewards exact phrase overlap above scattered shared words", () => {
    const query = "data warehouse";
    const phrase = "Data Warehouse Build";
    const scattered = "We store data and rent a warehouse nearby";

    expect(semanticScore(query, phrase)).toBeGreaterThan(semanticScore(query, scattered));
  });

  it("matches on a single shared term", () => {
    expect(semanticScore("hosting", "Managed Hosting")).toBeGreaterThan(0);
  });

  it("returns 0 for a query made only of stopwords", () => {
    expect(semanticScore("the and of", "Managed cloud hosting")).toBe(0);
  });

  it("returns 0 for an empty document", () => {
    expect(semanticScore("cloud", "")).toBe(0);
  });

  it("stays within [0, 1]", () => {
    const score = semanticScore("cloud hosting backup monitoring", "managed cloud hosting");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("is symmetric on its inputs", () => {
    // Deliberately asserting symmetry: cosine is, but the bigram blend is not.
    // This pins the behaviour so changing the blend is a conscious decision.
    const query = "cloud hosting";
    const document = "managed cloud hosting and backups";
    expect(semanticScore(query, document)).toBeGreaterThan(0);
    expect(semanticScore(document, query)).toBeGreaterThan(0);
  });
});

describe("organizationSearchDocument", () => {
  const organization = {
    name: "Rift Valley Security",
    description: "Penetration testing, security audits, and compliance readiness.",
    location: "Adama",
  };

  it("includes the industry, which may be the only place a taxonomy term appears", () => {
    // Regression: "Rift Valley Security" never writes "cybersecurity" itself, so
    // an industry-blind document made this listing unfindable for that query.
    const document = organizationSearchDocument(organization, [], "Cybersecurity");
    expect(semanticScore("cybersecurity", document)).toBeGreaterThan(0);
  });

  it("still matches on the organisation's own name", () => {
    expect(semanticScore("rift valley", organizationSearchDocument(organization, []))).toBeGreaterThan(0);
  });

  it("includes service names and descriptions", () => {
    const document = organizationSearchDocument(organization, [
      { name: "Penetration Test", description: "Authenticated penetration test." },
    ]);
    expect(semanticScore("penetration", document)).toBeGreaterThan(0);
  });

  it("tolerates a missing industry and a null description", () => {
    const document = organizationSearchDocument(
      { name: "Acme", description: null, location: null },
      [],
    );
    expect(document).toContain("Acme");
  });
});

describe("matchTerms", () => {
  it("returns surface words, not stems, for display", () => {
    // The stemmer strips "ing", so a naive implementation reports "host" to a
    // user who searched for "hosting".
    expect(matchTerms("cloud hosting", "Managed cloud hosting and backups")).toEqual([
      "cloud",
      "hosting",
    ]);
  });

  it("matches across a stem boundary", () => {
    expect(matchTerms("hosting", "Managed Host")).toEqual(["host"]);
  });

  it("caps the number of terms returned", () => {
    const document = "alpha beta gamma delta epsilon zeta";
    expect(matchTerms("alpha beta gamma delta epsilon zeta", document, 2)).toHaveLength(2);
  });
});

/* -------------------------------------------------------------------------- */
/* sentiment                                                                   */
/* -------------------------------------------------------------------------- */

describe("scorePolarity", () => {
  it("is positive for praise", () => {
    expect(scorePolarity("excellent brand work")).toBeGreaterThan(0);
  });

  it("is negative for complaint", () => {
    expect(scorePolarity("slow and unresponsive support")).toBeLessThan(0);
  });

  it("is neutral when no lexicon term appears", () => {
    expect(scorePolarity("the invoice number is 4471")).toBe(0);
  });

  it("inverts on negation", () => {
    expect(scorePolarity("not good")).toBeLessThan(scorePolarity("good"));
    expect(scorePolarity("not good")).toBeLessThan(0);
  });

  it("dampens a claim qualified by a diminisher", () => {
    // Compared on magnitude: "a few late handoffs" is a weaker complaint than
    // "very late handoffs", so its score must sit closer to zero.
    const qualified = Math.abs(scorePolarity("a few late handoffs"));
    const intense = Math.abs(scorePolarity("very late handoffs"));
    expect(qualified).toBeLessThan(intense);
    expect(qualified).toBeGreaterThan(0);
  });

  it("stays within [-1, 1]", () => {
    const extreme = "excellent amazing great perfect fantastic superb best love";
    expect(scorePolarity(extreme)).toBeLessThanOrEqual(1);
    expect(scorePolarity(extreme)).toBeGreaterThan(0);
  });
});

describe("analyzeSentiment", () => {
  it("returns a two-way split summing to 100", () => {
    const result = analyzeSentiment(["excellent work", "terrible support"]);
    expect(result.positive + result.negative).toBe(100);
  });

  it("splits 50/50 when nothing matches the lexicon", () => {
    expect(analyzeSentiment(["invoice 1234", "issued Tuesday"])).toEqual({
      positive: 50,
      negative: 50,
    });
  });

  it("returns 50/50 for no reviews at all", () => {
    expect(analyzeSentiment([])).toEqual({ positive: 50, negative: 50 });
  });

  it("ignores null comments instead of counting them as negative", () => {
    expect(analyzeSentiment([{ comment: null }])).toEqual({ positive: 50, negative: 50 });
  });

  it("accepts Review-shaped records", () => {
    const result = analyzeSentiment([{ comment: "excellent and reliable" }]);
    expect(result.positive).toBe(100);
  });

  it("always yields whole percentages", () => {
    const result = analyzeSentiment(["excellent", "good", "slow", "terrible"]);
    expect(Number.isInteger(result.positive)).toBe(true);
    expect(Number.isInteger(result.negative)).toBe(true);
  });

  it("does not net a caveat away against the praise around it", () => {
    // Regression: scoring the whole string as one signed average reported 0%
    // negative for a review that literally contains a complaint.
    const result = analyzeSentiment([
      "Strong engineering team. A few late handoffs during discovery.",
    ]);
    expect(result.negative).toBeGreaterThan(0);
    expect(result.positive).toBeGreaterThan(0);
  });

  it("surfaces a complaint that follows a contrast marker", () => {
    const result = analyzeSentiment(["Good creative output, though the reporting was slow to arrive."]);
    expect(result.negative).toBeGreaterThan(0);
  });

  it("agrees with the summary about the same review", () => {
    // The two features read the same text; they must not disagree about its sign.
    const reviews = [{ rating: 4, comment: "Strong team. A few late handoffs during discovery." }];
    const sentiment = analyzeSentiment(reviews);
    const summary = summarizeReviews(reviews, "Acme");
    expect(summary.weaknesses.length).toBeGreaterThan(0);
    expect(sentiment.negative).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* review summary                                                              */
/* -------------------------------------------------------------------------- */

const summaryReviews: Pick<Review, "rating" | "comment">[] = [
  { rating: 5, comment: "Delivered a complex billing system on time and communicated well throughout." },
  { rating: 4, comment: "Strong engineering team. A few late handoffs during discovery." },
  { rating: 4, comment: "Good creative output, though the reporting was slow to arrive." },
];

describe("summarizeReviews", () => {
  const summary = summarizeReviews(summaryReviews, "Acme");

  it("names the organization and the average rating", () => {
    expect(summary.summary).toContain("Acme");
    expect(summary.summary).toContain("4.3");
    expect(summary.summary).toContain("3 reviews");
  });

  it("derives strengths from actual review text, not a fixed template", () => {
    expect(summary.strengths.length).toBeGreaterThan(0);
    expect(summary.strengths.join(" ").toLowerCase()).toContain("engineering");
  });

  it("separates the caveat from the praise it follows", () => {
    // The weakness must come from after "though", not from the whole sentence,
    // which would have been net positive.
    expect(summary.weaknesses.join(" ").toLowerCase()).toContain("slow to arrive");
  });

  it("exposes a sentiment score in [0, 1]", () => {
    expect(summary.sentiment_score).toBeGreaterThanOrEqual(0);
    expect(summary.sentiment_score).toBeLessThanOrEqual(1);
  });

  it("returns an explicit empty state when there are no reviews", () => {
    const empty = summarizeReviews([], "Acme");
    expect(empty.strengths).toEqual([]);
    expect(empty.weaknesses).toEqual([]);
    expect(empty.summary).toContain("No reviews");
  });

  it("uses the singular for a single review", () => {
    expect(summarizeReviews([{ rating: 5, comment: "excellent" }], "Acme").summary).toContain(
      "1 review.",
    );
  });

  it("collapses duplicate clauses", () => {
    const duplicated = summarizeReviews(
      [
        { rating: 5, comment: "Excellent support." },
        { rating: 5, comment: "Excellent support." },
      ],
      "Acme",
    );
    expect(duplicated.strengths).toHaveLength(1);
  });

  it("is deterministic", () => {
    expect(summarizeReviews(summaryReviews, "Acme")).toEqual(summary);
  });

  it("honours the limit", () => {
    const many = summarizeReviews(summaryReviews, "Acme", 1);
    expect(many.strengths.length).toBeLessThanOrEqual(1);
    expect(many.weaknesses.length).toBeLessThanOrEqual(1);
  });

  it("survives reviews with null comments", () => {
    const result = summarizeReviews(
      [
        { rating: 5, comment: null },
        { rating: 5, comment: "Excellent brand work." },
      ],
      "Acme",
    );
    expect(result.strengths.join(" ")).toContain("brand");
  });
});

/* -------------------------------------------------------------------------- */
/* recommendations                                                             */
/* -------------------------------------------------------------------------- */

const organizations: Organization[] = [
  {
    id: "org-hosting",
    name: "Habesha Cloud Services",
    description: "Managed cloud hosting, backups, and 24/7 infrastructure monitoring.",
    industry_id: "ind-it",
    location: "Bahir Dar",
    phone: null,
    website: null,
    verification_status: "VERIFIED",
    rating: 3,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "org-brand",
    name: "Blue Nile Digital Agency",
    description: "Brand identity, performance marketing, and content production.",
    industry_id: "ind-agency",
    location: "Addis Ababa",
    phone: null,
    website: null,
    verification_status: "VERIFIED",
    rating: 4.5,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "org-unrelated",
    name: "Amhara IT Consultancy",
    description: "IT strategy, systems integration, and staff technical training.",
    industry_id: "ind-it",
    location: "Bahir Dar",
    phone: null,
    website: null,
    verification_status: "PENDING",
    rating: null,
    created_at: "2026-01-01T00:00:00.000Z",
  },
];

const services: Service[] = [
  {
    id: "svc-hosting",
    organization_id: "org-hosting",
    name: "Managed Hosting",
    description: "Managed VPS hosting with 99.9% uptime commitment.",
    price: 9000,
    status: true,
  },
  {
    id: "svc-brand",
    organization_id: "org-brand",
    name: "Brand Identity Package",
    description: "Logo, palette, typography, and brand guidelines.",
    price: 25000,
    status: true,
  },
];

describe("recommendOrganizations", () => {
  it("puts the topically relevant provider first", () => {
    const results = recommendOrganizations({
      category: "cloud hosting",
      organizations,
      services,
    });
    expect(results[0].id).toBe("org-hosting");
  });

  it("excludes organizations with no priced services from a budget run", () => {
    const results = recommendOrganizations({
      category: "consulting",
      budget: "low",
      organizations,
      services,
    });
    expect(results.map((item) => item.id)).not.toContain("org-unrelated");
  });

  it("ranks a location match above a non-match at equal topical fit", () => {
    // Both candidates must match the category equally, otherwise this would be
    // testing topical ranking rather than the location weight.
    const makeOrganization = (id: string, name: string, location: string): Organization => ({
      id,
      name,
      description: "Managed cloud hosting and backups.",
      industry_id: "ind-it",
      location,
      phone: null,
      website: null,
      verification_status: "VERIFIED",
      rating: null,
      created_at: "2026-01-01T00:00:00.000Z",
    });

    const results = recommendOrganizations({
      category: "cloud hosting",
      location: "Bahir Dar",
      organizations: [
        makeOrganization("far", "Alpha Cloud", "Jimma"),
        makeOrganization("near", "Beta Cloud", "Bahir Dar"),
      ],
      services: [],
    });

    expect(results.map((item) => item.id)).toEqual(["near", "far"]);
  });

  it("explains each recommendation", () => {
    const results = recommendOrganizations({
      category: "cloud hosting",
      budget: "low",
      location: "Bahir Dar",
      organizations,
      services,
    });
    expect(results[0].reason).toMatch(/Matches because it|offer|budget/);
  });

  it("is deterministic and ordered by descending score", () => {
    const first = recommendOrganizations({ category: "hosting", organizations, services });
    const second = recommendOrganizations({ category: "hosting", organizations, services });
    expect(first).toEqual(second);
    expect(first.map((item) => item.score)).toEqual([...first.map((item) => item.score)].sort((a, b) => b - a));
  });

  it("returns nothing for a stopword-only category", () => {
    expect(recommendOrganizations({ category: "the and of", organizations, services })).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* dashboard                                                                   */
/* -------------------------------------------------------------------------- */

describe("buildDashboard", () => {
  const organization = organizations[0];
  const reviews: Review[] = [
    {
      id: "r1",
      user_id: "u1",
      organization_id: "org-hosting",
      rating: 5,
      ratings: scores(5),
      comment: "excellent reliable hosting",
      verified: true,
      created_at: "2026-03-02T10:00:00.000Z",
    },
    {
      id: "r2",
      user_id: "u2",
      organization_id: "org-hosting",
      rating: 2,
      ratings: scores(2),
      comment: "support was slow",
      verified: true,
      created_at: "2026-02-11T10:00:00.000Z",
    },
    {
      id: "r3",
      user_id: "u3",
      organization_id: "org-hosting",
      rating: 4,
      ratings: scores(4),
      comment: "good uptime",
      verified: true,
      created_at: "2026-03-20T10:00:00.000Z",
    },
  ];

  const dashboard = buildDashboard({
    organization,
    reviews,
    peers: organizations.filter((entry) => entry.rating !== null),
  });

  it("counts reviews", () => {
    expect(dashboard.reviews).toBe(3);
  });

  it("groups rating trends by calendar month, oldest first", () => {
    expect(dashboard.rating_trends).toEqual([
      { period: "2026-02", average: 2 },
      { period: "2026-03", average: 4.5 },
    ]);
  });

  it("returns a sentiment split", () => {
    expect(dashboard.customer_sentiment?.positive).toBeGreaterThanOrEqual(0);
    expect(dashboard.customer_sentiment?.negative).toBeGreaterThanOrEqual(0);
  });

  it("ranks competitors by descending rating, 1-based", () => {
    // The dev backend resolves the name and verification status alongside the id
    // so the dashboard is not a list of "Peer organization" rows. Both are extra
    // to the documented contract, which carries only id and rank.
    expect(dashboard.competitor_position).toEqual([
      {
        organization_id: "org-brand",
        rank: 1,
        organization_name: "Blue Nile Digital Agency",
        verification_status: "VERIFIED",
      },
      {
        organization_id: "org-hosting",
        rank: 2,
        organization_name: "Habesha Cloud Services",
        verification_status: "VERIFIED",
      },
    ]);
  });

  it("synthesises a stable profile_views count", () => {
    expect(dashboard.profile_views).toBe(buildDashboard({
      organization,
      reviews,
      peers: [],
    }).profile_views);
  });

  it("handles an organization with no reviews", () => {
    const empty = buildDashboard({ organization, reviews: [], peers: [] });
    expect(empty.reviews).toBe(0);
    expect(empty.rating_trends).toEqual([]);
    expect(empty.competitor_position).toEqual([]);
  });
});