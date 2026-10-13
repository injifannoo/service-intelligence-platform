import { AdminShell } from "@/features/admin/components/admin-shell";

/**
 * Admin workspace shell, docs/07_Project_Structure.md:166.
 *
 * A separate route group from `(dashboard)` so the admin sidebar never renders
 * inside the customer header. The `(admin)` segment is a filesystem convention
 * and contributes nothing to the URL: these pages are served at `/admin/*`.
 *
 * Stays a Server Component — it only composes the shell, and the role check
 * inside `AdminShell` needs the browser's auth cookies.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
