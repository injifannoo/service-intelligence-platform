import { apiClient } from "@/lib/api-client";
import type { OrganizationReview, Review, ReviewInput, ReviewScores } from "@/types";

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

  /**
   * Edit own review — docs/02:181.
   *
   * ASSUMPTION, PENDING BACKEND CONFIRMATION: undocumented (docs/05 stops at
   * `POST /reviews/{id}/report/`), see the comment on the route handler.
   * `comment` is optional rather than required so a rating-only edit does not
   * have to resend text the server already has.
   */
  update(
    id: string,
    payload: {
      rating?: number;
      comment?: string | null;
      ratings?: Partial<ReviewScores>;
    },
  ): Promise<Review> {
    return apiClient.put<Review>(`/reviews/${id}/`, payload);
  },

  /** Delete own review — docs/02:182. ASSUMPTION, PENDING BACKEND CONFIRMATION. */
  remove(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/reviews/${id}/`);
  },
};
