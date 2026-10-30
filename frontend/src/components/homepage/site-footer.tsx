import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";
import { ROUTES, siteConfig } from "@/config/site-config";

/**
 * Placeholder contact address. ASSUMPTION, PENDING BACKEND CONFIRMATION: no
 * support inbox is configured yet, so the footer links to this alias until a
 * real one is provided.
 */
const CONTACT_EMAIL = "hello@asip.dev";

const PRIMARY_LINKS = [
  { label: "Home", href: ROUTES.home, route: true },
  { label: "Services", href: ROUTES.organizations, route: true },
  { label: "For Businesses", href: "#for-businesses", route: false },
  { label: "About", href: "#about", route: false },
] as const;

const linkClass = "text-sm text-navy-foreground/70 transition-all hover:text-navy-foreground hover:translate-x-0.5";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="on-dark relative overflow-hidden bg-navy text-navy-foreground">
      {/* Teal wash top-right, gold hint bottom-left */}
      <div className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-gold/8 blur-3xl" />
      
      <div className="relative mx-auto w-full max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-3">
            <Link href={ROUTES.home} className="inline-block outline-offset-4 transition-transform hover:scale-105">
              <BrandMark />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-navy-foreground/80">
              {siteConfig.tagline}
            </p>
          </div>

          <nav aria-label="Footer" className="space-y-3">
            <p className="text-xs font-bold tracking-wider text-navy-foreground/50 uppercase">
              Explore
            </p>
            <ul className="space-y-2">
              {PRIMARY_LINKS.map((link) => (
                <li key={link.href}>
                  {link.route ? (
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  ) : (
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                  Contact
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal" className="space-y-3">
            <p className="text-xs font-bold tracking-wider text-navy-foreground/50 uppercase">
              Legal
            </p>
            <ul className="space-y-2">
              <li>
                <Link href={ROUTES.privacy} className={linkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href={ROUTES.terms} className={linkClass}>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-sm text-navy-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium">
            © {year} {siteConfig.shortName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
