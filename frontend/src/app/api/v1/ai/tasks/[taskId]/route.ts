import type { NextRequest } from "next/server";

import { devBackendUnavailable, failure, ok, requireUser } from "@/lib/dev-backend/http";
import { findAiTask } from "@/lib/dev-backend/store";

/**
 * GET /api/v1/ai/tasks/{task_id}/ — docs/12_Testing_Strategy.md:204-206.
 *
 * Polled by `useAiReviewSummaryTask`; the status walks PENDING -> PROCESSING ->
 * SUCCESS so the client-side polling behaviour is actually exercisable.
 */
/**
 * `params` is typed explicitly rather than via the generated `RouteContext`
 * global, so `tsc --noEmit` passes on a fresh clone before any Next command has
 * generated types. Dynamic route params are always a Promise in route handlers.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const blocked = devBackendUnavailable();
  if (blocked) return blocked;

  const auth = requireUser(request);
  if ("response" in auth) return auth.response;

  const { taskId } = await params;
  const task = findAiTask(taskId);

  if (!task) {
    return failure(404, "NOT_FOUND", "Task not found.");
  }

  return ok({ task_id: task.task_id, status: task.status, result: task.result });
}
