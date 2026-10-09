import { redirect } from "next/navigation";

import { ROUTES } from "@/config/site-config";

/**
 * The verification queue is admin-only, so it now lives under `/admin`.
 *
 * Kept as a permanent redirect rather than deleted: bookmarks and audit-log links
 * point here, and a 404 would look like data loss.
 */
export default function VerificationRedirectPage() {
  redirect(ROUTES.adminVerification);
}
