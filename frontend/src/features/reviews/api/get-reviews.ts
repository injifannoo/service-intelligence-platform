import { apiClient } from "@/lib/api-client";
import type { OrganizationReview, Review, ReviewInput } from "@/types";

/**
 * Transport for the reviews slice, docs/05_API_Design.md:403-441.
 *
 * There is no documented "list all reviews" endpoint, so reads go through the
 * organization-scoped route (docs/04:349 attaches reviews to the organization,
 * not to a service).
 */
export const reviewsApi = {
  listForOrganization(organizationId: string): Promise<OrganizationReview[]> {
    return apiClient.get<OrganizationReview[]>(
      `/organizations/${organizationId}/reviews/`,
    );
  },

  create(payload: ReviewInput): Promise<Review> {
    return apiClient.post<Review>("/reviews/", payload);
  },

  report(id: string, reason: string, note?: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/reviews/${id}/report/`, {
      reason,
      note: note || undefined,
    });
  },
};
