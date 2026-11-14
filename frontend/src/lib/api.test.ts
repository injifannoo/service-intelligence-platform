import { describe, expect, it } from "vitest";

import { orgQuery, orgsQuery, orgReviewsQuery, servicesQuery } from "./api";
import { ORGS } from "./data";

describe("mock catalogue state", () => {
  it("keeps the ratings and trust scores already computed in data.ts", async () => {
    const orgs = await orgsQuery().queryFn!({} as never);
    const raw = ORGS[0];

    expect(orgs).toHaveLength(ORGS.length);
    expect(orgs.find((org) => org.slug === raw.slug)).toMatchObject({
      id: raw.slug,
      name: raw.name,
      category: raw.category,
      rating: raw.rating,
      reviewCount: raw.reviewCount,
      trustScore: raw.trustScore,
      verified: raw.verified,
      services: raw.services,
      sentiment: raw.sentiment,
    });
  });

  it("looks a provider up by slug", async () => {
    const raw = ORGS[0];

    await expect(orgQuery(raw.slug).queryFn!({} as never)).resolves.toMatchObject({
      slug: raw.slug,
      name: raw.name,
    });
  });

  it("maps mock reviews onto the review row shape used by the profile", async () => {
    const raw = ORGS[0];

    const reviews = await orgReviewsQuery(raw.slug).queryFn!({} as never);

    expect(reviews[0]).toMatchObject({
      id: `${raw.slug}-rev-1`,
      author_name: raw.reviews[0].author,
      rating: raw.reviews[0].rating,
      body: raw.reviews[0].text,
      created_at: raw.reviews[0].date,
      status: "published",
    });
  });

  it("derives mock services from the provider's service list", async () => {
    const raw = ORGS[0];

    const services = await servicesQuery(raw.slug).queryFn!({} as never);

    expect(services).toHaveLength(raw.services.length);
    expect(services[0]).toMatchObject({ org_id: raw.slug, name: raw.services[0] });
  });
});
