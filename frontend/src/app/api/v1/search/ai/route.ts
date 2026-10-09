import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  failure,
  ok,
  readJson,
  requireUser,
} from "@/lib/dev-backend/http";
import { listIndustries, listOrganizations, listServices } from "@/lib/dev-backend/store";
import { matchTerms, organizationSearchDocument, semanticScore } from "@/lib/dev-backend/ai";

/** Hits below this score are dropped rather than padded with unrelated results. */
const MIN_SCORE = 0.08;

const MAX_RESULTS = 10;

/**
 * POST /api/v1/search/ai/ — docs/05_API_Design.md:464-491.
 *
 * MVP Version 2 (docs/08_Development_Roadmap.md:416-426). Returns
 * `{ results: SemanticSearchHit[] }` in descending relevance.
 *
 * Authenticated because it is a rate-limited, compute-heavy endpoint in the real
 * design; docs/05 does not mark it public.
 *
 * The ranking is lexical, not embedding-based: see `lib/dev-backend/ai.ts` for why
 * and what that means.
 */
export async function POST(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) {
    return failure(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return failure(422, "MISSING_QUERY", "A non-empty `query` is required.");
  }

  // `Organization.industry_id` is nullable, so the lookup key is too. A null key
  // never matches an industry id, which correctly yields "no industry" text.
  const industries = new Map<string | null, string>(
    listIndustries().map((industry) => [industry.id, industry.name]),
  );

  const organizations = listOrganizations();
  const ranked = organizations
    .map((organization) => {
      const services = listServices(organization.id);
      const document = organizationSearchDocument(
        organization,
        services,
        industries.get(organization.industry_id),
      );

      // The organisation's own identity (name, industry, description) is weighted
      // above the service catalogue: a user asking for "cloud hosting" wants a
      // provider whose identity matches, not one that offers it alongside three
      // unrelated services.
      const ownText = [
        organization.name,
        industries.get(organization.industry_id) ?? "",
        organization.description ?? "",
      ].join(" ");

      return {
        organization,
        document,
        score: Math.max(
          semanticScore(query, ownText),
          semanticScore(query, document) * 0.9,
        ),
      };
    })
    .filter((entry) => entry.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.organization.name.localeCompare(b.organization.name))
    .slice(0, MAX_RESULTS);

  return ok({
    results: ranked.map((entry) => {
      const terms = matchTerms(query, entry.document);

      return {
        id: entry.organization.id,
        name: entry.organization.name,
        reason:
          terms.length > 0
            ? `Semantic match on ${terms.map((term) => `"${term}"`).join(", ")}.`
            : "Close thematic match on your description.",
        score: Math.round(entry.score * 100) / 100,
      };
    }),
  });
}