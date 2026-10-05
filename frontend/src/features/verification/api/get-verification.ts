import { apiClient, apiPaginated } from "@/lib/api-client";
import type {
  AuditLog,
  Pagination,
  VerificationClaim,
  VerificationClaimInput,
  VerificationStatus,
} from "@/types";

/**
 * Transport for the verification slice.
 *
 * ASSUMPTION, PENDING BACKEND CONFIRMATION: docs/05_API_Design.md documents no
 * admin endpoint at all, yet docs/08_Development_Roadmap.md:408 lists
 * "Admin Panel & Basic Audit Logs" as an MVP Version 1 requirement. The two
 * admin calls below follow the naming of the rest of the API.
 */
export const verificationApi = {
  submitClaim(
    organizationId: string,
    payload: Omit<VerificationClaimInput, "organization_id">,
  ): Promise<VerificationClaim> {
    return apiClient.post<VerificationClaim>(
      `/organizations/${organizationId}/verify/`,
      payload,
    );
  },

  async listClaims(): Promise<{
    data: (VerificationClaim & { organization_name: string | null })[];
    pagination: Pagination | null;
  }> {
    return apiPaginated<VerificationClaim & { organization_name: string | null }>(
      "/admin/verifications/",
      { query: { page_size: 50 } },
    );
  },

  decide(id: string, decision: "APPROVE" | "REJECT"): Promise<VerificationClaim> {
    return apiClient.post<VerificationClaim>(`/admin/verifications/${id}/`, {
      action: decision,
    });
  },

  async listAuditLogs(): Promise<{
    data: AuditLog[];
    pagination: Pagination | null;
  }> {
    return apiPaginated<AuditLog>("/admin/audit-logs/", {
      query: { page_size: 100 },
    });
  },
};

export type { VerificationStatus };
