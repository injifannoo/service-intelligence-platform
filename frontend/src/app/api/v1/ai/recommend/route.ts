import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  FieldErrors,
  failure,
  ok,
  readJson,
} from "@/lib/dev-backend/http";
import { listOrganizations, listServices, withRating } from "@/lib/dev-backend/store";
import { recommendOrganizations } from "@/lib/dev-backend/ai";

const BUDGETS = ["low", "medium", "high"] as const;

const MAX_RESULTS = 10;

/**
 * POST /api/v1/ai/recommend/ — docs/05_API_Design.md:565-586.
 *
 * MVP Version 2 (docs/08_Development_Roadmap.md:416-426). Request
 * `{ category, budget, location }`, response `{ recommendations: [] }`.
 *
 * Public: "receive AI recommendations" is explicitly part of the guest
 * experience, so this stays open to visitors without an account.
 *
 * `category` is required because with no category there is nothing to recommend
 * *on*. `budget` and `location` are optional filters; omitting one contributes
 * the midpoint weight rather than dropping the candidate.
 */
export async function POST(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const body = await readJson(request);
  if (!body) {
    return failure(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const errors = new FieldErrors();
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const budgetRaw =
    typeof body.budget === "string" ? body.budget.trim().toLowerCase() : "";

  if (!category) {
    errors.add("category", "A category is required.");
  }

  if (budgetRaw && !BUDGETS.includes(budgetRaw as (typeof BUDGETS)[number])) {
    errors.add("budget", `Budget must be one of: ${BUDGETS.join(", ")}.`);
  }

  if (!errors.isEmpty) {
    return errors.toResponse();
  }

  const budget = budgetRaw || undefined;
  const organizations = listOrganizations().map(withRating);
  const services = listServices();

  // Verified organizations are promoted ahead of unverified ones at equal topical
  // fit: docs/02_Product_Requirements.md positions verification as the platform's
  // core trust signal, so an unverified listing should not outrank a verified one
  // purely on keyword overlap.
  const recommendations = recommendOrganizations({
    category,
    budget,
    location: location || undefined,
    organizations,
    services,
  })
    .map((item) => {
      const organization = organizations.find((entry) => entry.id === item.id);
      const boost = organization?.verification_status === "VERIFIED" ? 0.08 : 0;
      return { ...item, score: Math.round((item.score + boost) * 100) / 100 };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, MAX_RESULTS);

  return ok({ recommendations });
}