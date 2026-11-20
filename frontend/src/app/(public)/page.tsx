import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeView } from "@/features/home/components/home-view";
import { Loading } from "@/components/shared/site";

export const metadata: Metadata = {
  title: "ASIP — AI Service Intelligence for Ethiopia",
  description: "Discover, compare and choose trusted technology service providers in Ethiopia with AI-powered insights.",
  openGraph: {
    title: "ASIP — AI Service Intelligence for Ethiopia",
    description: "The trust and decision intelligence layer between customers and service providers.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootHomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <HomeView />
    </Suspense>
  );
}