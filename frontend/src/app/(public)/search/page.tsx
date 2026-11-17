import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPage } from "@/features/search/components/search-page";
import { Loading } from "@/components/shared/site";

export const metadata: Metadata = {
  title: "Discover providers — ASIP",
  description: "AI-ranked technology service providers in Addis Ababa, with explainable match reasons.",
  openGraph: {
    title: "Discover providers — ASIP",
    description: "Ask in plain language and get explainable, trust-based recommendations.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function SearchRoute() {
  return (
    <Suspense fallback={<Loading />}>
      <SearchPage />
    </Suspense>
  );
}