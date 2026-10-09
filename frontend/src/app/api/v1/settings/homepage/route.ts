import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  failure,
  ok,
  readJson,
  requireSuperAdmin,
} from "@/lib/dev-backend/http";
import {
  getHomepageSettings,
  updateHomepageSettings,
} from "@/lib/dev-backend/store";
import { HOMEPAGE_SECTIONS } from "@/types";
import type { HomepageSettingsUpdate } from "@/types";

/**
 * GET /api/v1/settings/homepage/ — which homepage sections are visible.
 *
 * Public: rendering the marketing homepage needs the current configuration
 * without an account. The write side requires Super Admin, mirroring the
 * docs/02:96-104 division where "Super Admin manages platform configuration".
 */
export async function GET() {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  return ok(getHomepageSettings());
}

/**
 * PUT /api/v1/settings/homepage/ — switch homepage sections on or off.
 *
 * ASSUMPTION, NOT IN docs/05_API_Design.md: no settings endpoint is documented,
 * so this describes a frontend-owned workflow until the Django backend gains a
 * configuration model. Unknown keys and non-boolean values are ignored by the
 * store, so only a malformed payload shape is rejected here.
 */
export async function PUT(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireSuperAdmin(request);
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body || typeof body.sections !== "object" || body.sections === null || Array.isArray(body.sections)) {
    return failure(400, "VALIDATION_ERROR", "Please provide a sections object with section toggles.");
  }

  const sections: HomepageSettingsUpdate["sections"] = {};
  for (const [key, value] of Object.entries(body.sections)) {
    if (!(HOMEPAGE_SECTIONS as readonly string[]).includes(key)) continue;
    if (typeof value !== "boolean") continue;
    sections[key as (typeof HOMEPAGE_SECTIONS)[number]] = value;
  }

  return ok(updateHomepageSettings({ sections }));
}