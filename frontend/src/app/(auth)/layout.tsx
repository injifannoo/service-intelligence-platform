import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { ROUTES, siteConfig } from "@/config/site-config";

const PROOF_POINTS = [
  "Identity-checked providers only",
  "AI-distilled review sentiment",
  "Side-by-side metric comparison",
] as const;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1fr_minmax(0,34rem)]">
      {/* Left brand panel — hidden on mobile */}
      <aside
        aria-hidden="true"
        className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 lg:flex"
      >
        {/* Teal orb */}
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-accent/20 blur-3xl" />
        {/* Gold orb */}
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-80 rounded-full bg-gold/15 blur-3xl" />

        <Link href={ROUTES.home} className="relative w-fit rounded-lg outline-offset-4">
          <BrandMark wordmarkLight />
        </Link>

        <div className="relative max-w-md space-y-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/15 text-white shadow-md ring-1 ring-white/20">
            <SparklesIcon className="size-6" />
          </span>
          <h2 className="text-3xl leading-tight font-bold tracking-tight text-white">
            Make service decisions on evidence.
          </h2>
          <ul className="space-y-3">
            {PROOF_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm text-white/75">
                <span className="size-1.5 shrink-0 rounded-full bg-gold" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">{siteConfig.name}</p>
      </aside>

      {/* Right form panel */}
      <div className="flex min-h-screen flex-col bg-background lg:min-h-0">
        <header className="flex items-center px-6 py-5">
          <Link
            href={ROUTES.home}
            className="inline-flex rounded-lg outline-offset-4 lg:invisible"
          >
            <BrandMark />
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-12 pt-4">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
