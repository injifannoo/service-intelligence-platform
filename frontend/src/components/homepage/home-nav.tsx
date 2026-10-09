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
  "relative rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary";

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
          "absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary transition-opacity",
          active ? "opacity-100" : "opacity-0",
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 shadow-xs backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-6">
        <Link
          href={ROUTES.home}
          className="rounded-lg outline-offset-4 transition-opacity hover:opacity-90"
        >
          <BrandMark />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => renderLink(link))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden size-9 sm:inline-flex"
          >
            <Link href={ROUTES.search} aria-label="Search">
              <SearchIcon />
            </Link>
          </Button>
          <div className="hidden items-center gap-2 lg:flex">
            <HomeHeaderActions />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 lg:hidden"
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
        <div id="home-mobile-menu" className="border-t border-border bg-card lg:hidden">
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
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <HomeHeaderActions />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
