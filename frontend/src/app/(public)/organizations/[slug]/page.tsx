import type { Metadata } from "next";
import { Suspense } from "react";
import { buildOrganizationMetadata, buildOrganizationJsonLd } from "@/lib/seo";
import { OrganizationDetailView } from "@/features/organizations/components/organization-detail-view";
import { Loading } from "@/components/shared/site";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const orgMeta = buildOrganizationMetadata(slug);

  if (orgMeta.title === "Provider Not Found | ASIP Ethiopia") {
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

  return {
    ...orgMeta,
    twitter: {
      card: "summary",
    },
  };
}

export default async function OrganizationDetailPage({ params }: Props) {
  const { slug } = await params;
  const jsonLd = buildOrganizationJsonLd(slug);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Suspense fallback={<Loading />}>
        <OrganizationDetailView />
      </Suspense>
    </>
  );
}