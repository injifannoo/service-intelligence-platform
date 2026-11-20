import type { Metadata } from "next";
import { Suspense } from "react";
import { ComparisonView } from "@/features/comparison/components/comparison-view";
import { Loading } from "@/components/shared/site";

export const metadata: Metadata = {
  title: "Compare providers side by side — ASIP",
  description: "Compare trust scores, ratings, price, services and location across service providers.",
  openGraph: {
    title: "Compare providers — ASIP",
    description: "Side-by-side service intelligence for better decisions.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function CompareRoute() {
  return (
    <Suspense fallback={<Loading />}>
      <ComparisonView />
    </Suspense>
  );
}