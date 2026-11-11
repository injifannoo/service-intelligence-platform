import Link from "next/link";
import { Stars, TrustBadge } from "@/components/shared/site";
import type { Organization } from "../types";

export function OrganizationCard({ org }: { org: Organization }) {
  return (
    <Link href={`/org/${org.slug}`} className="flex justify-between gap-4 rounded-lg border bg-card p-5 hover:border-primary">
      <div>
        <p className="font-display text-xl">{org.name}</p>
        <p className="text-sm text-muted-foreground">{org.category} · {org.location}</p>
        <div className="mt-2"><Stars value={org.rating} /></div>
      </div>
      <TrustBadge score={org.trustScore} />
    </Link>
  );
}
