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
 * "Admin Panel & Basic Audit Logs" as an MVP Version 1 requirement. The admin
 * calls below follow the naming of the rest of the API.
 */

/** Rows requested per call while walking pages for an export. */
const EXPORT_PAGE_SIZE = 100;

/**
 * Bound on that walk.
 *
 * `docs/04:628` defines no purge for `audit_logs`, so the log grows for the
 * life of a deployment; an unbounded loop would eventually hang the tab. The
 * caller is told the real total so a capped export reads as partial.
 */
const EXPORT_MAX_PAGES = 50;

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

  /**
   * Every audit row, for the CSV export docs/02:126 requires.
   *
   * `listAuditLogs` returns the one page the table shows, which is not what a
   * report should silently contain, so the export walks the pages and reports
   * the total it stopped short of.
   */
  async listAllAuditLogs(): Promise<{ rows: AuditLog[]; total: number }> {
    const rows: AuditLog[] = [];
    let total = 0;

    for (let page = 1; page <= EXPORT_MAX_PAGES; page += 1) {
      const { data, pagination } = await apiPaginated<AuditLog>("/admin/audit-logs/", {
        query: { page_size: EXPORT_PAGE_SIZE, page },
      });

      rows.push(...data);
      total = pagination?.count ?? rows.length;

      if (data.length === 0 || rows.length >= total) break;
    }

    return { rows, total };
  },
};

export type { VerificationStatus };
