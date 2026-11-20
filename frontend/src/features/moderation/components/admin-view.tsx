"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Page, Loading, btnGhost } from "@/components/shared/site";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/data";

export function AdminView() {
  const { isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const orgs = useQuery({
    queryKey: ["admin-orgs"],
    enabled: isAdmin,
    queryFn: async () =>
      (
        await supabase
          .from("organizations")
          .select("id,slug,name,category,status,license_number,email,phone,created_at,owner_id")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const reports = useQuery({
    queryKey: ["admin-reports"],
    enabled: isAdmin,
    queryFn: async () =>
      (
        await supabase
          .from("review_reports")
          .select(
            "id,reason,status,created_at,review_id,reviews(id,body,rating,status,author_name,organizations(name,slug))",
          )
          .eq("status", "open")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const reviewCount = useQuery({
    queryKey: ["admin-review-count"],
    enabled: isAdmin,
    queryFn: async () =>
      (await supabase.from("reviews").select("id", { count: "exact", head: true })).count ?? 0,
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

  const setStatus = async (id: string, status: "verified" | "rejected") => {
    const { error } = await supabase.from("organizations").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "verified" ? "Organization verified" : "Organization rejected");
    qc.invalidateQueries();
  };

  const moderate = async (reportId: string, reviewId: string, remove: boolean) => {
    if (remove) {
      const { error } = await supabase
        .from("reviews")
        .update({ status: "removed" })
        .eq("id", reviewId);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    await supabase.from("review_reports").update({ status: "resolved" }).eq("review_id", reviewId);
    toast.success(remove ? "Review removed" : "Report dismissed");
    void reportId;
    qc.invalidateQueries();
  };

  const all = orgs.data ?? [];
  const pending = all.filter((o) => o.status === "pending");

  return (
    <Page>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="eyebrow text-muted-foreground">Governance</p>
        <h1 className="mt-2 text-5xl">Platform administration</h1>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            ["Organizations", all.length],
            ["Verified", all.filter((o) => o.status === "verified").length],
            ["Pending verification", pending.length],
            ["Open reports", reports.data?.length ?? 0],
          ].map(([l, v]) => (
            <div key={l} className="rounded-lg border bg-card p-5">
              <p className="eyebrow text-muted-foreground">{l}</p>
              <p className="mt-3 font-display text-4xl">{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {reviewCount.data ?? 0} reviews on the platform.
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
                      {o.category} · License: {o.license_number || "not provided"}{" "}
                      {o.email ? `· ${o.email}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStatus(o.id, "verified")}
                      className="rounded-md bg-success px-3 py-1.5 text-primary-foreground"
                    >
                      Approve
                    </button>
                    <button onClick={() => setStatus(o.id, "rejected")} className={btnGhost}>
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
              {reports.data?.length === 0 && (
                <li className="py-6 text-sm text-muted-foreground">Nothing to moderate.</li>
              )}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {reports.data?.map((r: any) => (
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
                      className="rounded-md bg-destructive px-3 py-1.5 text-destructive-foreground"
                    >
                      Remove review
                    </button>
                    <button onClick={() => moderate(r.id, r.review_id, false)} className={btnGhost}>
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
                  <th>Category</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {all.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Link
                        href={`/organizations/${o.slug}`}
                        className="hover:text-primary"
                      >
                        {o.name}
                      </Link>
                    </td>
                    <td>{o.category}</td>
                    <td className="capitalize">{o.status}</td>
                    <td className="text-right">
                      {o.status !== "verified" ? (
                        <button
                          onClick={() => setStatus(o.id, "verified")}
                          className="text-primary hover:underline"
                        >
                          Verify
                        </button>
                      ) : (
                        <button
                          onClick={() => setStatus(o.id, "rejected")}
                          className="text-destructive hover:underline"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Categories: {CATEGORIES.join(" · ")}</p>
        </section>
      </div>
    </Page>
  );
}