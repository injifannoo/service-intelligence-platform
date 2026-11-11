"use client";
import Link from "next/link";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";
import { toast } from "sonner";
import {
  Page,
  Stars,
  TrustBadge,
  Bar,
  Loading,
  inputCls,
  btnPrimary,
  btnGhost,
} from "@/components/shared/site";
import { orgReviewsQuery } from "@/lib/api";
import { getOrganization } from "@/features/organizations";
import { getServices } from "@/features/services";
import { usesRestBackend } from "@/lib/api-client";
import { priceLabel, criteriaAverages, CRITERIA, type CriterionKey } from "@/lib/metrics";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { refreshInsights } from "@/lib/ai.functions";
import { OrgGallery } from "@/features/organizations/components/gallery";
import {
  ReviewVerification,
  ReviewPhotoPicker,
  ReviewPhotoStrip,
  reviewPhotosQuery,
  uploadReviewPhotos,
  deleteReviewPhoto,
} from "@/features/reviews";

const EMPTY_CRIT: Record<CriterionKey, number> = {
  rating_technical: 0,
  rating_communication: 0,
  rating_delivery: 0,
  rating_value: 0,
};

type Resp = { body: string; updated_at: string; author_id: string } | null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const responseOf = (r: any): Resp => {
  const x = r.review_responses;
  return (Array.isArray(x) ? x[0] : x) ?? null;
};

function OwnerResponse(p: {
  reviewId: string;
  orgId: string;
  orgName: string;
  response: Resp;
  canReply: boolean;
  userId?: string | undefined;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(p.response?.body ?? "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!p.userId || body.trim().length < 2) return;
    setBusy(true);
    const { error } = await supabase.from("review_responses").upsert({
      review_id: p.reviewId,
      org_id: p.orgId,
      author_id: p.userId,
      body: body.trim(),
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Response published");
    setOpen(false);
    p.onDone();
  };
  const del = async () => {
    if (!confirm("Remove your response?")) return;
    const { error } = await supabase.from("review_responses").delete().eq("review_id", p.reviewId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    p.onDone();
  };
  return (
    <div className="mt-3">
      {p.response && !open && (
        <div className="rounded-md border-l-2 border-accent bg-muted/50 p-3 text-sm">
          <p className="eyebrow text-accent">Response from {p.orgName}</p>
          <p className="mt-1">{p.response.body}</p>
          {p.canReply && (
            <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
              <button onClick={() => setOpen(true)} className="hover:text-foreground">
                Edit response
              </button>
              <button onClick={del} className="hover:text-destructive">
                Remove
              </button>
            </div>
          )}
        </div>
      )}
      {p.canReply && !p.response && !open && (
        <button onClick={() => setOpen(true)} className="text-xs text-primary hover:underline">
          Respond publicly
        </button>
      )}
      {open && (
        <div className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Write an official, professional response…"
            className={inputCls}
          />
          <div className="flex gap-2">
            <button disabled={busy} onClick={save} className={btnPrimary}>
              Publish response
            </button>
            <button onClick={() => setOpen(false)} className={btnGhost}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrganizationDetailView() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const { user, displayName, isAdmin } = useAuth();
  const qc = useQueryClient();
  const refresh = refreshInsights;
  const restMode = usesRestBackend();
  const { data: org, isLoading } = useQuery(getOrganization(slug));
  const reviews = useQuery({ ...orgReviewsQuery(org?.id ?? ""), enabled: !!org && !restMode });
  const services = useQuery({ ...getServices(org?.id ?? ""), enabled: !!org });
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [crit, setCrit] = useState<Record<CriterionKey, number>>(EMPTY_CRIT);
  const [files, setFiles] = useState<File[]>([]);
  const photos = useQuery({
    ...reviewPhotosQuery((reviews.data ?? []).map((r) => r.id)),
    enabled: !restMode,
  });

  if (isLoading)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (!org)
    return (
      <Page>
        <p className="p-20 text-center">
          Organization not found.{" "}
          <Link className="text-primary underline" href="/search">
            Browse providers
          </Link>
        </p>
      </Page>
    );

  const mine = reviews.data?.find((r) => r.user_id === user?.id);
  const isOwner = !restMode && user?.id && org.ownerId === user.id;

  const reload = () => {
    qc.invalidateQueries({ queryKey: ["reviews", org.id] });
    qc.invalidateQueries({ queryKey: ["org", slug] });
    qc.invalidateQueries({ queryKey: ["orgs"] });
  };
  // Runs out-of-band so the review write never waits on AI.
  const regenerate = () => {
    refresh({ data: { orgId: org.id } })
      .then(reload)
      .catch(() => undefined);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || text.trim().length < 10) {
      toast.error("Please write at least 10 characters.");
      return;
    }
    setBusy(true);
    const sub = {
      rating_technical: crit.rating_technical || null,
      rating_communication: crit.rating_communication || null,
      rating_delivery: crit.rating_delivery || null,
      rating_value: crit.rating_value || null,
    };
    const res = editing
      ? await supabase
          .from("reviews")
          .update({ rating, body: text.trim(), ...sub })
          .eq("id", editing)
      : await supabase
          .from("reviews")
          .insert({
            org_id: org.id,
            user_id: user.id,
            author_name: displayName || "Customer",
            rating,
            body: text.trim(),
            ...sub,
          })
          .select("id")
          .single();
    if (!res.error && files.length) {
      const rid = editing ?? (res.data as { id: string } | null)?.id;
      if (rid)
        await uploadReviewPhotos(rid, user.id, files).catch((err) =>
          toast.error((err as Error).message),
        );
    }
    setBusy(false);
    if (res.error) {
      toast.error(
        res.error.code === "23505"
          ? "You have already reviewed this organization."
          : res.error.message,
      );
      return;
    }
    toast.success(editing ? "Review updated" : "Review published — AI summary is updating");
    setText("");
    setEditing(null);
    setRating(5);
    setCrit(EMPTY_CRIT);
    setFiles([]);
    reload();
    qc.invalidateQueries({ queryKey: ["review-photos"] });
    regenerate();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete your review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Review deleted");
    reload();
    regenerate();
  };

  const report = async (id: string) => {
    if (!user) {
      toast.error("Sign in to report a review.");
      return;
    }
    const reason = prompt("Why are you reporting this review? (spam, fake, offensive…)");
    if (!reason) return;
    const { error } = await supabase
      .from("review_reports")
      .insert({ review_id: id, reporter_id: user.id, reason });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thanks — our moderators will review it.");
  };

  return (
    <Page>
      <section className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="eyebrow text-muted-foreground">
            {org.category} · {org.location}
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              {org.logoUrl && (
                <img
                  src={org.logoUrl}
                  alt={`${org.name} logo`}
                  className="h-20 w-20 rounded-lg border bg-background object-contain"
                />
              )}
              <div>
                <h1 className="text-5xl">{org.name}</h1>
                <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{org.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-5 text-sm text-muted-foreground">
                  <Stars value={org.rating} />
                  <span>{org.reviewCount} reviews</span>
                  {org.founded && <span>Since {org.founded}</span>}
                  <span>{org.size} staff</span>
                  <span>{priceLabel(org.priceTier)}</span>
                  {org.verified ? (
                    <span className="text-success">✓ Verified organization</span>
                  ) : (
                    <span>Verification pending</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <TrustBadge score={org.trustScore} />
              <Link
                className={`${btnGhost} self-center`}
                href={`/compare?ids=${encodeURIComponent(org.slug)}`}
              >
                Compare
              </Link>
              {isOwner && (
                <Link href="/analytics" className={`${btnPrimary} self-center`}>
                  Manage
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          {!restMode && <OrgGallery orgId={org.id} />}
          <section className="rounded-lg bg-ink-gradient p-8 text-ink-foreground">
            <p className="eyebrow text-accent">AI review summary</p>
            <p className="mt-4 font-display text-2xl leading-snug">
              {org.aiSummary || "Not enough reviews for an AI summary yet."}
            </p>
            {(org.strengths.length > 0 || org.issues.length > 0) && (
              <div className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
                <div>
                  <p className="eyebrow opacity-70">Strengths</p>
                  <ul className="mt-2 space-y-1">
                    {org.strengths.map((s) => (
                      <li key={s}>+ {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="eyebrow opacity-70">Common issues</p>
                  <ul className="mt-2 space-y-1">
                    {org.issues.map((s) => (
                      <li key={s}>− {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <p className="mt-6 text-xs opacity-60">
              AI-generated from published reviews. Advisory only.
            </p>
          </section>

          {org.description && org.description !== org.tagline && (
            <section>
              <h2 className="text-3xl">About</h2>
              <p className="mt-4 whitespace-pre-line text-muted-foreground">{org.description}</p>
            </section>
          )}

          <section>
            <h2 className="text-3xl">Services</h2>
            {services.isError && (
              <p role="alert" className="mt-4 text-destructive">
                Services could not be loaded.
              </p>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {services.data?.map((s) => (
                <div key={s.id} className="rounded-lg border bg-card p-4">
                  <p className="font-medium">{s.name}</p>
                  {s.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  )}
                  {s.price_from != null && (
                    <p className="mt-2 text-sm text-primary">
                      From ETB {Number(s.price_from).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
              {services.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">No services listed yet.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-3xl">Reviews</h2>
            {restMode ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Review posting is unavailable while account integration is pending.
              </p>
            ) : !user ? (
              <div className="mt-6 rounded-lg border bg-card p-5 text-sm">
                <Link
                  className="text-primary underline"
                  href="{/login?redirect=${encodedURIComponent(/organizations/${slug})}}"
                >
                  Sign in
                </Link>{" "}
                to write a review.
              </div>
            ) : isOwner ? (
              <p className="mt-6 rounded-lg border bg-card p-5 text-sm text-muted-foreground">
                You manage this organization, so you can't review it.
              </p>
            ) : !mine || editing ? (
              <form onSubmit={submit} className="mt-6 rounded-lg border bg-card p-5">
                <p className="font-medium">
                  {editing ? "Edit your review" : "Share your experience"}
                </p>
                <div className="mt-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      type="button"
                      aria-label={`${n} stars`}
                      key={n}
                      onClick={() => setRating(n)}
                      className={n <= rating ? "text-2xl text-accent" : "text-2xl text-border"}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {CRITERIA.map(([k, label]) => (
                    <label key={k} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <select
                        value={crit[k]}
                        onChange={(e) => setCrit({ ...crit, [k]: Number(e.target.value) })}
                        className="rounded-md border bg-background px-2 py-1 text-sm"
                      >
                        <option value={0}>Skip</option>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} ★
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="What went well? What could improve?"
                  className={`${inputCls} mt-3`}
                />
                <ReviewPhotoPicker
                  files={files}
                  onChange={setFiles}
                  existing={editing ? (photos.data?.[editing]?.length ?? 0) : 0}
                />
                <div className="mt-3 flex gap-2">
                  <button disabled={busy} className={btnPrimary}>
                    {editing ? "Save changes" : "Post review"}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(null);
                        setText("");
                      }}
                      className={btnGhost}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : null}

            <div className="mt-6 space-y-4">
              {reviews.data?.map((r) => (
                <div key={r.id} className="rounded-lg border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars value={r.rating} />
                    <ReviewVerification proof={r} />
                  </div>
                  {CRITERIA.some(([k]) => r[k]) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {CRITERIA.map(([k, label]) =>
                        r[k] ? (
                          <span key={k}>
                            {label} <span className="text-foreground">{r[k]}/5</span>
                          </span>
                        ) : null,
                      )}
                    </div>
                  )}
                  <p className="mt-3">{r.body}</p>
                  <ReviewPhotoStrip
                    photos={photos.data?.[r.id]}
                    canDelete={r.user_id === user?.id || isAdmin}
                    onDelete={(id) =>
                      deleteReviewPhoto(id)
                        .then(() => qc.invalidateQueries({ queryKey: ["review-photos"] }))
                        .catch((e) => toast.error((e as Error).message))
                    }
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {r.author_name} · {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    {r.user_id === user?.id ? (
                      <>
                        <button
                          onClick={() => {
                            setEditing(r.id);
                            setText(r.body);
                            setRating(r.rating);
                            setCrit({
                              rating_technical: r.rating_technical ?? 0,
                              rating_communication: r.rating_communication ?? 0,
                              rating_delivery: r.rating_delivery ?? 0,
                              rating_value: r.rating_value ?? 0,
                            });
                          }}
                          className="hover:text-foreground"
                        >
                          Edit
                        </button>
                        <button onClick={() => remove(r.id)} className="hover:text-destructive">
                          Delete
                        </button>
                      </>
                    ) : (
                      <button onClick={() => report(r.id)} className="hover:text-destructive">
                        Report
                      </button>
                    )}
                  </div>
                  <OwnerResponse
                    reviewId={r.id}
                    orgId={org.id}
                    orgName={org.name}
                    response={responseOf(r)}
                    canReply={!!isOwner}
                    userId={user?.id}
                    onDone={reload}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {(() => {
            const avg = criteriaAverages(reviews.data ?? []);
            if (!CRITERIA.some(([k]) => avg[k] != null)) return null;
            return (
              <div className="rounded-lg border bg-card p-6">
                <p className="eyebrow text-muted-foreground">Rating breakdown</p>
                <div className="mt-4 space-y-3 text-sm">
                  {CRITERIA.map(([k, label]) => (
                    <div key={k}>
                      <div className="mb-1 flex justify-between">
                        <span>{label}</span>
                        <span>{avg[k]?.toFixed(1) ?? "—"}</span>
                      </div>
                      <Bar value={((avg[k] ?? 0) / 5) * 100} tone="accent" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className="rounded-lg border bg-card p-6">
            <p className="eyebrow text-muted-foreground">Sentiment</p>
            <div className="mt-4 space-y-3 text-sm">
              {(
                [
                  ["Positive", org.sentiment.positive, "success"],
                  ["Neutral", org.sentiment.neutral, "accent"],
                  ["Negative", org.sentiment.negative, "destructive"],
                ] as const
              ).map(([l, v, t]) => (
                <div key={l}>
                  <div className="mb-1 flex justify-between">
                    <span>{l}</span>
                    <span>{v}%</span>
                  </div>
                  <Bar value={v} tone={t} />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2 rounded-lg border bg-card p-6 text-sm">
            <p className="eyebrow mb-3 text-muted-foreground">Contact</p>
            <p>📍 {org.location}</p>
            {org.phone && (
              <p>
                ☎{" "}
                <a href={`tel:${org.phone}`} className="hover:underline">
                  {org.phone}
                </a>
              </p>
            )}
            {org.email && (
              <p>
                ✉{" "}
                <a href={`mailto:${org.email}`} className="hover:underline">
                  {org.email}
                </a>
              </p>
            )}
            {org.website && (
              <p>
                ↗{" "}
                <a
                  href={org.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {org.website.replace(/^https?:\/\//, "")}
                </a>
              </p>
            )}
            {org.businessHours && <p>🕒 {org.businessHours}</p>}
          </div>
          <div className="rounded-lg border bg-card p-6 text-sm">
            <p className="eyebrow text-muted-foreground">Industries</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {org.industries.map((s) => (
                <li key={s} className="rounded bg-secondary px-2 py-1">
                  {s}
                </li>
              ))}
            </ul>
            <p className="eyebrow mt-6 text-muted-foreground">Certifications</p>
            <ul className="mt-3 space-y-1">
              {org.certifications.length ? (
                org.certifications.map((s) => <li key={s}>✓ {s}</li>)
              ) : (
                <li className="text-muted-foreground">None listed</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </Page>
  );
}
