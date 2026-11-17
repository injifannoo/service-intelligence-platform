/** Django's public read contract, mapped at the slice boundary rather than in pages. */
export type RestOrganization = {
  id: string;
  slug: string;
  name: string;
  status: string;
  owner?: string | null;
  ai_insight?: unknown;
  [field: string]: unknown;
};

export function fromRestOrganization(row: RestOrganization) {
  return { ...row, owner_id: row.owner ?? null, ai_insights: row.ai_insight ?? null };
}