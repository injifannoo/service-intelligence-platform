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

const linkClass = "text-sm text-muted-foreground transition-colors hover:text-foreground";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="on-dark bg-navy text-navy-foreground">
      <div className="mx-auto w-full max-w-7xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-4">
            <Link href={ROUTES.home} className="inline-block outline-offset-4">
              <BrandMark />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {siteConfig.name} — {siteConfig.tagline}
            </p>
          </div>

          <nav aria-label="Footer" className="space-y-3">
            <p className="text-xs font-semibold tracking-wider text-navy-foreground/60 uppercase">
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
            <p className="text-xs font-semibold tracking-wider text-navy-foreground/60 uppercase">
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
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/15 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.shortName}. All rights reserved.
          </p>
          <p>{siteConfig.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
