"use client";
import Link from "next/link";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Page, Bar, Sparkline, Loading, inputCls, btnPrimary, btnGhost } from "@/components/shared/site";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { orgsQuery, servicesQuery, slugify, toView } from "@/lib/api";
import { CATEGORIES } from "@/lib/data";
import { refreshInsights } from "@/lib/ai.functions";
import type { OrgView } from "@/lib/metrics";
import { GalleryManager } from "@/features/organizations/components/gallery";
function useMyOrg() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-org", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*, ai_insights(*), reviews(rating, created_at, status)")
        .eq("owner_id", user!.id)
        .neq("status", "archived")
        .maybeSingle();
      if (error) throw error;
      return data ? toView(data) : null;
    },
  });
}

export function DashboardView() {
  const my = useMyOrg();
  const [tab, setTab] = useState<"insights" | "profile" | "services">("insights");
  if (my.isLoading)
    return (
      <Page>
        <Loading />
      </Page>
    );
  if (!my.data)
    return (
      <Page>
        <RegisterOrg />
      </Page>
    );
  const org = my.data;
  return (
    <Page>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted-foreground">Organization workspace</p>
            <h1 className="mt-2 text-5xl">{org.name}</h1>
            <p className="mt-2 text-sm">
              Status:{" "}
              <span
                className={
                  org.status === "verified"
                    ? "text-success"
                    : org.status === "rejected"
                      ? "text-destructive"
                      : "text-warning"
                }
              >
                {org.status === "verified"
                  ? "✓ Verified"
                  : org.status === "rejected"
                    ? "Verification rejected — update your details and contact support"
                    : "Pending verification"}
              </span>
            </p>
          </div>
          <Link href={`/organizations/${org.slug}`} className={btnGhost}>
            View public profile
          </Link>
        </div>
        <div className="mt-8 flex gap-1 border-b">
          {(["insights", "profile", "services"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm capitalize ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
            >
              {t === "insights" ? "Analytics & AI" : t}
            </button>
          ))}
        </div>
        <div className="mt-8">
          {tab === "insights" && <Insights org={org} />}
          {tab === "profile" && (
            <div className="space-y-6">
              <ProfileForm org={org} />
              <GalleryManager orgId={org.id} />
            </div>
          )}
          {tab === "services" && <Services orgId={org.id} />}
        </div>
      </div>
    </Page>
  );
}

const MONTHS = (() => {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - 6 + i, 1).toLocaleString("en", { month: "short" }),
  );
})();

function Insights({ org }: { org: OrgView }) {
  const all = useQuery(orgsQuery());
  const qc = useQueryClient();
  const refresh = refreshInsights;
  const [busy, setBusy] = useState(false);
  const peers = (all.data ?? []).filter((o) => o.category === org.category || o.id === org.id);
  const market = all.data?.length
    ? Math.round(all.data.reduce((s, o) => s + o.trustScore, 0) / all.data.length)
    : 0;
  const delta = (org.satisfactionTrend.at(-1) ?? 0) - (org.satisfactionTrend[0] ?? 0);
  const regen = async () => {
    setBusy(true);
    try {
      await refresh({ data: { orgId: org.id } });
      await qc.invalidateQueries();
      toast.success("AI insights refreshed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const exportCsv = () => {
    const rows = [
      ["Metric", "Value"],
      ["Trust score", org.trustScore],
      ["Rating", org.rating],
      ["Reviews", org.reviewCount],
      ["Positive %", org.sentiment.positive],
      ["Neutral %", org.sentiment.neutral],
      ["Negative %", org.sentiment.negative],
      ["Main complaint", org.mainComplaint],
      ["Recommendation", org.recommendation],
      ...MONTHS.map((m, i) => [`Satisfaction ${m}`, org.satisfactionTrend[i] ?? ""]),
    ];
    const blob = new Blob(
      [rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")],
      { type: "text/csv" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${org.slug}-report.csv`;
    a.click();
  };
  return (
    <>
      <div className="flex justify-end gap-2">
        <button onClick={exportCsv} className={btnGhost}>
          Export report (CSV)
        </button>
        <button onClick={regen} disabled={busy} className={btnPrimary}>
          {busy ? "Analyzing reviews…" : "Refresh AI insights"}
        </button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        {[
          ["Trust score", org.trustScore, `Market avg ${market}`],
          ["Avg rating", org.rating ? org.rating.toFixed(1) : "—", `${org.reviewCount} reviews`],
          [
            "Positive sentiment",
            `${org.sentiment.positive}%`,
            `${org.sentiment.negative}% negative`,
          ],
          [
            "Response time",
            `${org.responseHours}h`,
            org.responseHours > 24 ? "Above 24h target" : "On target",
          ],
        ].map(([l, v, s]) => (
          <div key={l} className="rounded-lg border bg-card p-5 shadow-card">
            <p className="eyebrow text-muted-foreground">{l}</p>
            <p className="mt-3 font-display text-4xl">{v}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex justify-between">
            <p className="font-medium">Customer satisfaction trend</p>
            <span className={delta >= 0 ? "text-sm text-success" : "text-sm text-destructive"}>
              {delta >= 0 ? "+" : ""}
              {delta} pts / 6 mo
            </span>
          </div>
          <div className="mt-6">
            <Sparkline data={org.satisfactionTrend} />
          </div>
          <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
            {MONTHS.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-ink-gradient p-6 text-ink-foreground">
          <p className="eyebrow text-accent">AI business recommendation</p>
          <p className="mt-4 font-display text-2xl leading-snug">
            {org.recommendation || "Collect more reviews to unlock recommendations."}
          </p>
          {org.mainComplaint && (
            <p className="mt-6 text-sm opacity-70">
              Main complaint detected: <span className="opacity-100">{org.mainComplaint}</span>
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <p className="font-medium">Service quality signals</p>
          <p className="mt-2 text-sm text-muted-foreground">{org.aiSummary}</p>
          <div className="mt-5 grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="eyebrow text-success">Strengths</p>
              <ul className="mt-2 space-y-1">
                {org.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow text-destructive">Weaknesses</p>
              <ul className="mt-2 space-y-1">
                {org.issues.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="font-medium">Competitor benchmark · {org.category}</p>
          <div className="mt-5 space-y-3 text-sm">
            {(peers.length > 1 ? peers : (all.data ?? []))
              .slice()
              .sort((a, b) => b.trustScore - a.trustScore)
              .slice(0, 6)
              .map((o) => (
                <div key={o.id}>
                  <div className="mb-1 flex justify-between">
                    <span className={o.id === org.id ? "font-medium text-primary" : ""}>
                      {o.id === org.id ? `${o.name} (you)` : o.name}
                    </span>
                    <span>{o.trustScore}</span>
                  </div>
                  <Bar value={o.trustScore} tone={o.id === org.id ? "accent" : "primary"} />
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}

type Form = {
  name: string;
  tagline: string;
  description: string;
  category: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  business_hours: string;
  founded: string;
  size: string;
  price_tier: number;
  response_hours: number;
  industries: string;
  certifications: string;
  license_number: string;
};

function fromOrg(o?: OrgView): Form {
  return {
    name: o?.name ?? "",
    tagline: o?.tagline ?? "",
    description: o?.description ?? "",
    category: o?.category ?? CATEGORIES[0]!,
    location: o?.location ?? "Addis Ababa",
    phone: o?.phone ?? "",
    email: o?.email ?? "",
    website: o?.website ?? "",
    business_hours: o?.businessHours ?? "Mon–Fri 8:30–17:30",
    founded: o?.founded ? String(o.founded) : "",
    size: o?.size ?? "1-10",
    price_tier: o?.priceTier ?? 2,
    response_hours: o?.responseHours ?? 24,
    industries: o?.industries.join(", ") ?? "",
    certifications: o?.certifications.join(", ") ?? "",
    license_number: "",
  };
}

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function OrgFields({ f, set }: { f: Form; set: (p: Partial<Form>) => void }) {
  const field = (
    k: keyof Form,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        value={String(f[k])}
        onChange={(e) => set({ [k]: e.target.value } as Partial<Form>)}
        className={`${inputCls} mt-1`}
        {...props}
      />
    </label>
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {field("name", "Organization name *", { required: true, maxLength: 120 })}
      <label className="block text-sm">
        <span className="text-muted-foreground">Category *</span>
        <select
          value={f.category}
          onChange={(e) => set({ category: e.target.value })}
          className={`${inputCls} mt-1`}
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="md:col-span-2">
        {field("tagline", "Tagline *", { required: true, maxLength: 160 })}
      </div>
      <label className="block text-sm md:col-span-2">
        <span className="text-muted-foreground">Description</span>
        <textarea
          rows={4}
          maxLength={3000}
          value={f.description}
          onChange={(e) => set({ description: e.target.value })}
          className={`${inputCls} mt-1`}
        />
      </label>
      {field("location", "Location *", { required: true })}
      {field("business_hours", "Business hours")}
      {field("phone", "Phone")}
      {field("email", "Business email", { type: "email" })}
      {field("website", "Website", { type: "url", placeholder: "https://" })}
      {field("founded", "Year founded", { type: "number", min: 1900, max: 2100 })}
      <label className="block text-sm">
        <span className="text-muted-foreground">Team size</span>
        <select
          value={f.size}
          onChange={(e) => set({ size: e.target.value })}
          className={`${inputCls} mt-1`}
        >
          {["1-10", "11-50", "51-200", "200+"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">Price level</span>
        <select
          value={f.price_tier}
          onChange={(e) => set({ price_tier: Number(e.target.value) })}
          className={`${inputCls} mt-1`}
        >
          <option value={1}>Affordable</option>
          <option value={2}>Mid-range</option>
          <option value={3}>Premium</option>
        </select>
      </label>
      {field("response_hours", "Typical response time (hours)", {
        type: "number",
        min: 1,
        max: 720,
      })}
      {field("industries", "Industries served (comma separated)")}
      {field("certifications", "Certifications (comma separated)")}
      {field("license_number", "Trade license number (for verification)")}
    </div>
  );
}

function payload(f: Form) {
  return {
    name: f.name.trim(),
    tagline: f.tagline.trim(),
    description: f.description.trim(),
    category: f.category,
    location: f.location.trim(),
    phone: f.phone || null,
    email: f.email || null,
    website: f.website || null,
    business_hours: f.business_hours || null,
    founded: f.founded ? Number(f.founded) : null,
    size: f.size,
    price_tier: f.price_tier,
    response_hours: Number(f.response_hours) || 24,
    industries: list(f.industries),
    certifications: list(f.certifications),
    ...(f.license_number ? { license_number: f.license_number } : {}),
  };
}

function RegisterOrg() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(fromOrg());
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const slug = `${slugify(f.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase
      .from("organizations")
      .insert({ ...payload(f), slug, owner_id: user!.id });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Organization registered — pending verification");
    qc.invalidateQueries();
  };
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="eyebrow text-primary">For organizations</p>
      <h1 className="mt-3 text-5xl">Register your business</h1>
      <p className="mt-3 text-muted-foreground">
        Create your profile to appear in AI search, collect verified reviews and unlock sentiment
        analytics. Our team verifies every business before the trust badge is shown.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-6 rounded-lg border bg-card p-6 shadow-card">
        <OrgFields f={f} set={(p) => setF({ ...f, ...p })} />
        <button disabled={busy} className={btnPrimary}>
          {busy ? "Submitting…" : "Register & request verification"}
        </button>
      </form>
    </div>
  );
}

function ProfileForm({ org }: { org: OrgView }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(fromOrg(org));
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(fromOrg(org)), [org]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("organizations").update(payload(f)).eq("id", org.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
    qc.invalidateQueries();
  };
  const archive = async () => {
    if (!confirm("Archive this organization? It will be hidden from search (data is kept)."))
      return;
    const { error } = await supabase
      .from("organizations")
      .update({ status: "archived" })
      .eq("id", org.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Organization archived");
    qc.invalidateQueries();
  };
  return (
    <form onSubmit={save} className="space-y-6 rounded-lg border bg-card p-6">
      <LogoField org={org} />
      <OrgFields f={f} set={(p) => setF({ ...f, ...p })} />
      <div className="flex justify-between">
        <button disabled={busy} className={btnPrimary}>
          {busy ? "Saving…" : "Save profile"}
        </button>
        <button
          type="button"
          onClick={archive}
          className="text-sm text-destructive hover:underline"
        >
          Archive organization
        </button>
      </div>
    </form>
  );
}

function Services({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(servicesQuery(orgId));
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const syncSummary = async () => {
    const { data: s } = await supabase.from("services").select("name").eq("org_id", orgId);
    await supabase
      .from("organizations")
      .update({ services_summary: (s ?? []).map((x) => x.name) })
      .eq("id", orgId);
    qc.invalidateQueries();
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const row = {
      name: name.trim(),
      description: desc.trim(),
      price_from: price ? Number(price) : null,
    };
    const { error } = editId
      ? await supabase.from("services").update(row).eq("id", editId)
      : await supabase.from("services").insert({ ...row, org_id: orgId });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editId ? "Service updated" : "Service added");
    setName("");
    setDesc("");
    setPrice("");
    setEditId(null);
    syncSummary();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    syncSummary();
  };
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <form onSubmit={save} className="h-fit space-y-3 rounded-lg border bg-card p-6">
        <p className="font-medium">{editId ? "Edit service" : "Add a service"}</p>
        <input
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Service name"
          className={inputCls}
        />
        <textarea
          rows={3}
          maxLength={1000}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description"
          className={inputCls}
        />
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Starting price (ETB, optional)"
          className={inputCls}
        />
        <div className="flex gap-2">
          <button className={btnPrimary}>{editId ? "Save" : "Add service"}</button>
          {editId && (
            <button
              type="button"
              onClick={() => {
                setEditId(null);
                setName("");
                setDesc("");
                setPrice("");
              }}
              className={btnGhost}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="space-y-3">
        {isLoading && <Loading />}
        {data?.length === 0 && (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No services yet.
          </p>
        )}
        {data?.map((s) => (
          <div
            key={s.id}
            className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4"
          >
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-muted-foreground">{s.description}</p>
              {s.price_from != null && (
                <p className="mt-1 text-sm text-primary">
                  From ETB {Number(s.price_from).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-3 text-sm">
              <button
                onClick={() => {
                  setEditId(s.id);
                  setName(s.name);
                  setDesc(s.description);
                  setPrice(s.price_from != null ? String(s.price_from) : "");
                }}
                className="hover:underline"
              >
                Edit
              </button>
              <button onClick={() => del(s.id)} className="text-destructive hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function toLogoDataUrl(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const size = 256;
  const scale = Math.min(size / img.width, size / img.height, 1);
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/webp", 0.85);
}

function LogoField({ org }: { org: OrgView }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const setLogo = async (logo_url: string | null) => {
    setBusy(true);
    const { error } = await supabase.from("organizations").update({ logo_url }).eq("id", org.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(logo_url ? "Logo updated" : "Logo removed");
    qc.invalidateQueries();
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    try {
      await setLogo(await toLogoDataUrl(file));
    } catch {
      toast.error("Could not read that image");
    }
  };
  return (
    <div className="flex items-center gap-5">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-background text-xs text-muted-foreground">
        {org.logoUrl ? (
          <img src={org.logoUrl} alt="Logo" className="h-full w-full object-contain" />
        ) : (
          "No logo"
        )}
      </div>
      <div className="flex gap-3">
        <label className={btnGhost + " cursor-pointer"}>
          {busy ? "Uploading…" : "Upload logo"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onFile}
            disabled={busy}
          />
        </label>
        {org.logoUrl && (
          <button
            type="button"
            className="text-sm text-destructive hover:underline"
            onClick={() => setLogo(null)}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
