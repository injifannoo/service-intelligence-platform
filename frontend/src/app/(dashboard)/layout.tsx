import { Header } from "@/components/shared/header";

/**
 * Authenticated workspace shell, docs/07_Project_Structure.md:166.
 *
 * Stays a Server Component — it only composes layout. The access token itself
 * is never read here; `proxy.ts` handles the redirect before this renders.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-8 sm:py-10">
        <div className="min-w-0">{children}</div>
      </main>
    </div>
  );
}
