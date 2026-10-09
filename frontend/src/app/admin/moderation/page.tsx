import { PageHeader } from "@/components/shared/page-header";
import { AdminModeration } from "@/features/admin/components/admin-moderation";

/**
 * Moderation queue for reported reviews.
 *
 * docs/02:127 requires "manual abuse reporting queues", docs/02:314-315
 * require that reviews are moderated and fraudulent ones removed, and
 * docs/09 Sprint 6:358 puts the moderation workflow in the frontend
 * deliverable.
 */
export default function AdminModerationPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Moderation"
        description="Review reported content and remove abusive or fraudulent reviews."
      />

      <AdminModeration />
    </div>
  );
}
