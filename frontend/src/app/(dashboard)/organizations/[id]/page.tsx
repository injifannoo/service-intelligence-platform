import { OrganizationDetail } from "@/features/organizations";

/**
 * Next 16 provides `params` as a Promise to a Server Component; it is awaited
 * before the client detail component receives the id.
 */
export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OrganizationDetail organizationId={id} />;
}
