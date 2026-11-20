"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/features/notifications";

export function SiteHeader() {
  const { user, isAdmin, displayName } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.replace("/auth");
  };
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary font-display text-lg text-primary-foreground">
            A
          </span>
          <span className="font-display text-xl">ASIP</span>
        </Link>
        <nav className="hidden gap-7 text-sm md:flex">
          <Link href="/search" className="text-muted-foreground hover:text-foreground">
            Discover
          </Link>
          <Link
            href="/compare"
            className="text-muted-foreground hover:text-foreground"
          >
            Compare
          </Link>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground"
          >
            For organizations
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground"
              >
              Admin
            </Link>
          )}
        </nav>
        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <NotificationBell userId={user.id} />
            <span className="hidden text-muted-foreground sm:inline">{displayName}</span>
            <button onClick={signOut} className="rounded-md border px-3 py-2 hover:bg-muted">
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/auth"
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row">
        <p>
          <span className="font-display text-foreground">ASIP</span> — AI-Powered Service
          Intelligence Platform. Addis Ababa, Ethiopia.
        </p>
        <p className="max-w-md">
          AI recommendations are advisory only. Always confirm details directly with providers.
        </p>
      </div>
    </footer>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  const r = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-accent">
        {"★".repeat(r)}
        <span className="text-border">{"★".repeat(5 - r)}</span>
      </span>
      <span className="font-medium">{value ? value.toFixed(1) : "New"}</span>
    </span>
  );
}

export function TrustBadge({ score }: { score: number }) {
  return (
    <div className="flex h-fit flex-col items-center justify-center rounded-md border bg-card px-3 py-2">
      <span className="font-display text-2xl leading-none text-primary">{score}</span>
      <span className="eyebrow mt-1 text-[0.55rem] text-muted-foreground">Trust</span>
    </div>
  );
}

export function Bar({
  value,
  tone = "primary",
}: {
  value: number;
  tone?: "primary" | "accent" | "destructive" | "success";
}) {
  const cls = {
    primary: "bg-primary",
    accent: "bg-accent",
    destructive: "bg-destructive",
    success: "bg-success",
  }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full ${cls}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data) - 2,
    max = Math.max(...data) + 2;
  const pts = data
    .map((d, i) => `${(i / (data.length - 1)) * 100},${30 - ((d - min) / (max - min || 1)) * 30}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 30" className="h-24 w-full" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="py-16 text-center text-sm text-muted-foreground">{label}</p>;
}

export const inputCls =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
export const btnPrimary =
  "rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50";
export const btnGhost = "rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50";
