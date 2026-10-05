import { apiClient } from "@/lib/api-client";
import type { ComparisonRequest, ComparisonResult } from "@/types";

/**
 * Transport for the comparison slice, docs/05_API_Design.md:493-520.
 *
 * The documented response is a single `comparison` key. No document specifies
 * its row shape, so the route returns the organizations plus their service
 * catalogues; see the route for the assumption note.
 */
export const comparisonApi = {
  compare(payload: ComparisonRequest): Promise<ComparisonResult> {
    return apiClient.post<ComparisonResult>("/comparison/", payload);
  },
};
