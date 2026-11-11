import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardView } from "@/features/analytics/components/dashboard-view";
import { Loading } from "@/components/shared/site";

export const metadata: Metadata = {
  title: "Organization workspace — ASIP",
  description: "Manage your profile and services, and track sentiment, benchmarks and AI recommendations.",
  openGraph: {
    title: "Organization workspace — ASIP",
    description: "Understand how customers see your service and how to improve.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function DashboardRoute() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardView />
    </Suspense>
  );
}