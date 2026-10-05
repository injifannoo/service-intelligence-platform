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
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,32rem)]">
      {/* Brand panel. Hidden on small screens where the form should own the
          full viewport, and marked aria-hidden because the same value is
          already announced by the form. */}
      <aside
        aria-hidden="true"
        className="surface-gradient relative hidden flex-col justify-between overflow-hidden border-r border-border bg-muted/40 p-12 lg:flex"
      >
        <Link href={ROUTES.home} className="w-fit rounded-lg outline-offset-4">
          <BrandMark />
        </Link>

        <div className="max-w-md space-y-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <SparklesIcon className="size-6" />
          </span>
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            Make service decisions on evidence.
          </h2>
          <ul className="space-y-2.5">
            {PROOF_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">{siteConfig.name}</p>
      </aside>

      <div className="flex flex-col">
        <header className="p-6">
          <Link
            href={ROUTES.home}
            className="inline-flex rounded-lg outline-offset-4 lg:invisible"
          >
            <BrandMark />
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
