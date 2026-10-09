import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/shared/brand-mark";
import { ROUTES, siteConfig } from "@/config/site-config";

/**
 * Minimal shell for the legal pages linked from the footer.
 *
 * Deliberately not the full homepage chrome: these pages need no auth modal or
 * marketing sections, only a way back and readable prose.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center px-6">
          <Link href={ROUTES.home} className="rounded-lg outline-offset-4">
            <BrandMark />
          </Link>
          <Link
            href={ROUTES.home}
            className="ml-auto text-sm font-medium text-primary hover:underline"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="mt-8 space-y-6 leading-relaxed text-muted-foreground">
          {children}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-3xl px-6 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.shortName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
