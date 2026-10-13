"use client";

import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import type { SemanticSearchHit } from "@/types";

/** One recommendation as returned by `POST /api/v1/ai/recommend/`. */
export interface Recommendation {
  id: string;
  name: string;
  reason: string;
  score: number;
}

export interface RecommendInput {
  category: string;
  budget?: string;
  location?: string;
}

/**
 * MVP Version 2 AI transports (docs/08_Development_Roadmap.md:416-426).
 *
 * All three are `POST` + `mutation` rather than queries: each takes a body, and
 * modelling a computed result as a cacheable query invites stale-key bugs for no
 * benefit. Results are not persisted to a query cache at all.
 */
export const aiApi = {
  /** `POST /api/v1/search/ai/` — docs/05_API_Design.md:464-491. */
  async semanticSearch(query: string): Promise<SemanticSearchHit[]> {
    const data = await apiClient.post<{ results: SemanticSearchHit[] }>("/search/ai/", {
      query,
    });
    return data.results ?? [];
  },

  /** `POST /api/v1/ai/recommend/` — docs/05_API_Design.md:565-586. */
  async recommend(input: RecommendInput): Promise<Recommendation[]> {
    const data = await apiClient.post<{ recommendations: Recommendation[] }>(
      "/ai/recommend/",
      input,
    );
    return data.recommendations ?? [];
  },
};

export function useSemanticSearch() {
  return useMutation({
    mutationFn: (query: string) => aiApi.semanticSearch(query),
  });
}

export function useRecommend() {
  return useMutation({
    mutationFn: (input: RecommendInput) => aiApi.recommend(input),
  });
}