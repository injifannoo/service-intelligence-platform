import { HomeNav } from "@/components/homepage/home-nav";
import { HomepageSections } from "@/components/homepage/homepage-sections";
import { SiteFooter } from "@/components/homepage/site-footer";

/**
 * Public marketing homepage.
 *
 * Statically prerendered: `HomepageSections` is a client island whose fallback
 * renders every section, and the only data it reads comes from the public
 * directory and settings endpoints, so the page never needs server-side session
 * state.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <HomeNav />
      <main className="flex-1">
        <HomepageSections />
      </main>
      <SiteFooter />
    </div>
  );
}