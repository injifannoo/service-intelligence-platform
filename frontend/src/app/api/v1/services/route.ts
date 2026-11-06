import type { NextRequest } from "next/server";

import {
  created,
  devBackendUnavailable,
  failure,
  FieldErrors,
  paginate,
  readJson,
  readPageParams,
  requireUser,
  str,
  num,
} from "@/lib/dev-backend/http";
import {
  createService,
  findCategoryById,
  findOrganization,
  listServices,
} from "@/lib/dev-backend/store";

/**
 * GET /api/v1/services/ — docs/05_API_Design.md:384-391.
 *
 * Supports filtering by organization_id, category_id, search, and status.
 */
export async function GET(request: NextRequest) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const params = request.nextUrl.searchParams;
  const page = readPageParams(params);
  const organizationId = params.get("organization_id") ?? undefined;
  const categoryId = params.get("category_id") ?? undefined;
  const search = params.get("search") ?? undefined;
  const statusParam = params.get("status");
  const status =
    statusParam === "true" ? true : statusParam === "false" ? false : undefined;

  const services = listServices(organizationId, { category_id: categoryId, search, status });

  return paginate(services, page, {
    organization_id: organizationId,
    category_id: categoryId,
    search,
  });
}

/**
 * POST /api/v1/services/ — docs/05_API_Design.md:365-381.
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

  const name = str(body.name)?.trim();
  const organizationId = str(body.organization_id);

  const errors = new FieldErrors();
  if (!name) errors.add("name", "This field is required.");
  if (!organizationId || !findOrganization(organizationId)) {
    errors.add("organization_id", "A valid organization_id is required.");
  }
  if (!errors.isEmpty) return errors.toResponse();

  const price = body.price !== undefined ? num(body.price) : undefined;
  const categoryId = str(body.category_id) ?? null;
  if (categoryId && !findCategoryById(categoryId)) {
    return failure(400, "VALIDATION_ERROR", "Category not found.", {
      category_id: ["Category does not exist."],
    });
  }

  const service = createService({
    organization_id: organizationId as string,
    name: name as string,
    description: str(body.description),
    price,
    category_id: categoryId,
    status: typeof body.status === "boolean" ? body.status : true,
  });

  return created(service);
}
