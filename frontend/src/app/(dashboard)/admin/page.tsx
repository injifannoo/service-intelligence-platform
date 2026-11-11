import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminView } from "@/features/moderation/components/admin-view";
import { Loading } from "@/components/shared/site";

export const metadata: Metadata = {
  title: "Platform moderation — ASIP",
  description: "Verify organizations, moderate customer reviews and review reported content.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRoute() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminView />
    </Suspense>
  );
}