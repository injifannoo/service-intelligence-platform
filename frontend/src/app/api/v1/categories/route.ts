import type { NextRequest } from "next/server";

import {
  devBackendUnavailable,
  paginate,
  readPageParams,
} from "@/lib/dev-backend/http";
import { listCategories } from "@/lib/dev-backend/store";

/**
 * GET /api/v1/categories/ — Sprint 4 (docs/09:284-306).
 *
 * Public: the service form and catalogue filters need the vocabulary before a
 * user signs in. Returns all categories in a single page.
 */
export async function GET(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const params = request.nextUrl.searchParams;
  const page = readPageParams(params);
  const search = params.get("search") ?? undefined;

  let categories = listCategories();
  if (search) {
    const q = search.toLowerCase();
    categories = categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }

  return paginate(categories, page, { search });
}
