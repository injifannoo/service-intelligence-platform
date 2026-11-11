import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthView } from "@/features/auth/components/auth-view";
import { Loading } from "@/components/shared/site";

export const metadata: Metadata = {
  title: "Sign in — ASIP",
  description: "Sign in or create your ASIP account to review providers or manage your organization.",
  openGraph: {
    title: "Sign in — ASIP",
    description: "Access ASIP service intelligence.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function AuthRoute() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthView />
    </Suspense>
  );
}