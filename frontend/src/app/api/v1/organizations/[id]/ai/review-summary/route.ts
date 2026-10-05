import type { NextRequest } from "next/server";

import {
  accepted,
  devBackendUnavailable,
  failure,
  requireUser,
} from "@/lib/dev-backend/http";
import { createAiTask, findOrganization } from "@/lib/dev-backend/store";

/**
 * POST /api/v1/organizations/{id}/ai/review-summary/
 * — docs/05_API_Design.md:526-540.
 *
 * Returns 202 with a task id, not a summary. AI work runs out of band so it
 * never blocks the originating write (docs/02_Product_Requirements.md:317), and
 * the client polls `/api/v1/ai/tasks/{task_id}/` to resolve it.
 */
/**
 * `params` is typed explicitly rather than via the generated `RouteContext`
 * global, so `tsc --noEmit` passes on a fresh clone before any Next command has
 * generated types. Dynamic route params are always a Promise in route handlers.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!findOrganization(id)) {
    return failure(404, "NOT_FOUND", "Organization not found.");
  }

  const task = createAiTask(id);

  return accepted({ task_id: task.task_id, status: task.status });
}
