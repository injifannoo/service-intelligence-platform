import { devBackendUnavailable, ok } from "@/lib/dev-backend/http";
import { listIndustries } from "@/lib/dev-backend/store";

/**
 * GET /api/v1/industries/
 *
 * Not in docs/05_API_Design.md, but docs/04:296-314 defines an Industry entity
 * and docs/02:115 requires an Industry Management module. The organization
 * create form (docs/05:282-290) takes an industry by name, so the frontend
 * needs the valid set to render a select rather than a free-text field.
 *
 * Seeded to Technology Services sub-categories only, per docs/08:314-326.
 */
export async function GET() {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  return ok(listIndustries());
}
