import { beforeEach, describe, expect, it } from "vitest";

import {
  createReview,
  findReview,
  resetDevBackend,
  updateReview,
} from "@/lib/dev-backend/store";

/**
 * Per-dimension review ratings, docs/04_Database_Design.md:357-375.
 *
 * The docs name five dimensions (Quality, Price, Customer Service, Speed,
 * Overall Experience) without giving them columns, so the scores ride on the
 * review row as `ratings`. These tests lock in the two invariants the rest of
 * the system depends on: an omitted dimension defaults to the overall rating,
 * and the overall dimension always tracks the documented `rating` integer.
 */
describe("review dimension ratings", () => {
  beforeEach(() => {
    resetDevBackend();
  });

  it("defaults every dimension to the overall rating when none are sent", () => {
    const review = createReview({
      organization_id: "org-1",
      user_id: "user-1",
      author_name: "Ada",
      rating: 3,
    });

    expect(review.ratings).toEqual({
      quality: 3,
      price: 3,
      customer_service: 3,
      speed: 3,
      overall_experience: 3,
    });
  });

  it("keeps sent dimensions and defaults the ones that were omitted", () => {
    const review = createReview({
      organization_id: "org-1",
      user_id: "user-1",
      author_name: "Ada",
      rating: 4,
      ratings: { quality: 5, price: 2 },
    });

    expect(review.ratings).toEqual({
      quality: 5,
      price: 2,
      customer_service: 4,
      speed: 4,
      overall_experience: 4,
    });
  });

  it("moves the overall dimension whenever the rating integer changes", () => {
    const created = createReview({
      organization_id: "org-1",
      user_id: "user-1",
      author_name: "Ada",
      rating: 5,
      ratings: { quality: 1, price: 1, customer_service: 1, speed: 1 },
    });

    const updated = updateReview(created.id, { rating: 2 });

    expect(updated?.rating).toBe(2);
    expect(updated?.ratings).toEqual({
      quality: 1,
      price: 1,
      customer_service: 1,
      speed: 1,
      overall_experience: 2,
    });
  });

  it("merges a partial dimension edit without touching the other scores", () => {
    const created = createReview({
      organization_id: "org-1",
      user_id: "user-1",
      author_name: "Ada",
      rating: 3,
    });

    updateReview(created.id, { ratings: { speed: 5 } });

    expect(findReview(created.id)?.ratings).toEqual({
      quality: 3,
      price: 3,
      customer_service: 3,
      speed: 5,
      overall_experience: 3,
    });
  });
});