import type { Metadata } from "next";
import { Suspense } from "react";
import { OrganizationDetailView } from "@/features/organizations/components/organization-detail-view";
import { Loading } from "@/components/shared/site";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `${name} — Reviews & AI insights | ASIP`,
    description: `Verified reviews, trust score and AI review summary for ${name}.`,
    openGraph: {
      title: `${name} on ASIP`,
      description: `Is ${name} the right provider for you? See verified evidence on ASIP.`,
      type: "profile",
    },
    twitter: {
      card: "summary",
    },
  };
}

export default function OrganizationDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrganizationDetailView />
    </Suspense>
  );
}