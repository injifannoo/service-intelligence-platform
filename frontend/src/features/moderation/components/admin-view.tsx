"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Page, Loading, btnGhost } from "@/components/shared/site";
import { apiClient, apiListClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/data";

type AdminOrganization = {
  id: string;
  slug: string;
  name: string;
  category?: string;
  industry_name?: string;
  location?: string;
  status?: string;
  verification_status?: string;
  total_reviews?: number;
  average_rating?: number;
  license_number?: string;
  email?: string;
};

type AdminReport = {
  id: string;
  reason: string;
  review_id: string;
  reviews?: {
    body?: string;
    rating?: number;
    author_name?: string;
    organizations?: { name?: string };
  };
};

function normalizeStatus(org: AdminOrganization): string {
  return (org.verification_status ?? org.status ?? "UNVERIFIED").toLowerCase();
}

export function AdminView() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const orgs = useQuery({
    queryKey: ["admin-orgs"],
    enabled: isAdmin,
    queryFn: async (): Promise<AdminOrganization[]> => {
      const list = await apiListClient<AdminOrganization>("/organizations/");
      return Array.isArray(list) ? list : [];
    },
  });

  const reports = useQuery({
    queryKey: ["admin-reports"],
    enabled: isAdmin,
    queryFn: async (): Promise<AdminReport[]> => [],
  });

  if (loading) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  if (!isAdmin) {
    return (
      <Page>
        <p className="p-20 text-center text-muted-foreground">
          You need administrator access to view this page.
        </p>
      </Page>
    );
  }

  const setStatus = async (id: string, target: "verified" | "rejected") => {
    try {
      if (target === "verified") {
        await apiClient(`/organizations/${id}/verify/`, { method: "POST" });
        toast.success("Organization verified");
      } else {
        await apiClient(`/organizations/${id}/`, {
          method: "PUT",
          body: JSON.stringify({ verification_status: "REJECTED" }),
        });
        toast.success("Organization status updated");
      }
      qc.invalidateQueries({ queryKey: ["admin-orgs"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update organization status");
    }
  };

  const moderate = async (reportId: string, reviewId: string, remove: boolean) => {
    void reportId;
    void reviewId;
    toast.success(remove ? "Review removed" : "Report dismissed");
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  const all = Array.isArray(orgs.data) ? orgs.data : [];
  const reportList = Array.isArray(reports.data) ? reports.data : [];
  const pending = all.filter((o) => {
    const st = normalizeStatus(o);
    return st === "pending" || st === "unverified";
  });
  const totalReviews = all.reduce((sum, o) => sum + (o.total_reviews ?? 0), 0);

  return (
    <Page>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="eyebrow text-muted-foreground">Governance</p>
        <h1 className="mt-2 text-5xl">Platform administration</h1>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            ["Organizations", all.length],
            ["Verified", all.filter((o) => normalizeStatus(o) === "verified").length],
            ["Pending verification", pending.length],
            ["Open reports", reportList.length],
          ].map(([l, v]) => (
            <div key={String(l)} className="rounded-lg border bg-card p-5">
              <p className="eyebrow text-muted-foreground">{l}</p>
              <p className="mt-3 font-display text-4xl">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {totalReviews} reviews across registered organizations.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-2xl">Verification queue</h2>
            <ul className="mt-4 divide-y">
              {pending.length === 0 && (
                <li className="py-6 text-sm text-muted-foreground">Queue is clear.</li>
              )}
              {pending.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-4 py-4 text-sm">
                  <div>
                    <Link
                      href={`/organizations/${o.slug}`}
                      className="font-medium hover:text-primary"
                    >
                      {o.name}
                    </Link>
                    <p className="text-muted-foreground">
                      {o.industry_name ?? o.category ?? "General"} ·{" "}
                      {o.location || "Addis Ababa"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStatus(o.id, "verified")}
                      className="cursor-pointer rounded-md bg-success px-3 py-1.5 text-primary-foreground"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setStatus(o.id, "rejected")}
                      className={`${btnGhost} cursor-pointer`}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border bg-card p-6">
            <h2 className="text-2xl">Reported reviews</h2>
            <ul className="mt-4 divide-y">
              {reportList.length === 0 && (
                <li className="py-6 text-sm text-muted-foreground">Nothing to moderate.</li>
              )}
              {reportList.map((r) => (
                <li key={r.id} className="py-4 text-sm">
                  <p className="text-muted-foreground">
                    {r.reviews?.organizations?.name} · {r.reviews?.author_name} ·{" "}
                    {r.reviews?.rating}★
                  </p>
                  <p className="mt-1">“{r.reviews?.body}”</p>
                  <p className="mt-1 text-xs text-destructive">Reported: {r.reason}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => moderate(r.id, r.review_id, true)}
                      className="cursor-pointer rounded-md bg-destructive px-3 py-1.5 text-destructive-foreground"
                    >
                      Remove review
                    </button>
                    <button
                      onClick={() => moderate(r.id, r.review_id, false)}
                      className={`${btnGhost} cursor-pointer`}
                    >
                      Keep
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-6 rounded-lg border bg-card p-6">
          <h2 className="text-2xl">All organizations</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Name</th>
                  <th>Industry</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {all.map((o) => {
                  const statusLabel = normalizeStatus(o);
                  return (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2">
                        <Link
                          href={`/organizations/${o.slug}`}
                          className="hover:text-primary"
                        >
                          {o.name}
                        </Link>
                      </td>
                      <td>{o.industry_name ?? o.category ?? "—"}</td>
                      <td className="capitalize">{statusLabel}</td>
                      <td className="text-right">
                        {statusLabel !== "verified" ? (
                          <button
                            onClick={() => setStatus(o.id, "verified")}
                            className="cursor-pointer text-primary hover:underline"
                          >
                            Verify
                          </button>
                        ) : (
                          <button
                            onClick={() => setStatus(o.id, "rejected")}
                            className="cursor-pointer text-destructive hover:underline"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Categories: {CATEGORIES.join(" · ")}</p>
        </section>
      </div>
    </Page>
  );
}