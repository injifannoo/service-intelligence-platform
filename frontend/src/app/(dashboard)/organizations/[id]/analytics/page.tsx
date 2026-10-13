import { OrganizationAnalytics } from "@/features/organizations";

/**
 * Next 16 provides `params` as a Promise to a Server Component; it is awaited
 * before the client component receives the id.
 */
export default async function OrganizationAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OrganizationAnalytics organizationId={id} />;
}
