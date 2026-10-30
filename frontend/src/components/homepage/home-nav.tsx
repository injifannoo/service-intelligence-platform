"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, SearchIcon, XIcon } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import { HomeHeaderActions } from "@/components/shared/home-header-actions";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/site-config";
import { cn } from "@/lib/utils";

interface NavLink {
  label: string;
  href: string;
  /** `true` navigates with `next/link`; `false` is an in-page anchor. */
  route: boolean;
  /** Route prefix checked for the active state. */
  match?: string;
}

/** `route` items are navigated with `next/link`; `hash` items are in-page anchors. */
const LINKS: readonly NavLink[] = [
  { label: "Home", href: ROUTES.home, route: true },
  { label: "Services", href: ROUTES.organizations, route: true, match: "/organizations" },
  { label: "For Businesses", href: "#for-businesses", route: false },
  { label: "About", href: "#about", route: false },
];

const linkClass =
  "relative rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:text-primary hover:bg-accent/50";

/**
 * Marketing header for the public homepage.
 *
 * Separate from the signed-in `Header` because the two answer different
 * questions: this one drives acquisition, so it keeps the in-page section
 * anchors and the auth-aware CTAs from `HomeHeaderActions`. Active route links
 * get a small underline instead of the dashboard's filled pill, which reads as
 * navigation rather than as a selected tab.
 */
export function HomeNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isActive(link: NavLink) {
    if (!link.route) return false;
    if (link.match) return pathname.startsWith(link.match);
    return pathname === link.href;
  }

  function renderLink(link: NavLink, onNavigate?: () => void) {
    const active = isActive(link);
    const classes = cn(linkClass, active && "text-primary");
    const underline = (
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-primary to-accent-foreground transition-all",
          active ? "opacity-100 scale-100" : "opacity-0 scale-75",
        )}
      />
    );

    return link.route ? (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={classes}
        onClick={onNavigate}
      >
        {link.label}
        {underline}
      </Link>
    ) : (
      <a key={link.href} href={link.href} className={classes} onClick={onNavigate}>
        {link.label}
        {underline}
      </a>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 shadow-sm backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-6">
        <Link
          href={ROUTES.home}
          className="rounded-xl outline-offset-4 transition-all hover:opacity-80"
        >
          <BrandMark />
        </Link>

        <nav aria-label="Primary" className="ml-8 hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => renderLink(link))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden size-10 sm:inline-flex"
          >
            <Link href={ROUTES.search} aria-label="Search">
              <SearchIcon />
            </Link>
          </Button>
          <div className="hidden items-center gap-3 lg:flex">
            <HomeHeaderActions />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="home-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <XIcon /> : <MenuIcon />}
          </Button>
        </div>
      </div>

      {open && (
        <div id="home-mobile-menu" className="border-t border-border/60 bg-card/95 backdrop-blur-xl lg:hidden">
          <nav
            aria-label="Mobile"
            className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-6 py-4"
          >
            {LINKS.map((link) => renderLink(link, () => setOpen(false)))}
            <Link
              href={ROUTES.search}
              className={cn(linkClass, "flex items-center gap-2")}
              onClick={() => setOpen(false)}
            >
              <SearchIcon className="size-4" aria-hidden="true" />
              Search
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <HomeHeaderActions />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
