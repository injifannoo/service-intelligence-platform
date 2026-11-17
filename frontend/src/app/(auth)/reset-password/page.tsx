import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordView } from "@/features/auth/components/reset-password-view";
import { Loading } from "@/components/shared/site";

export const metadata: Metadata = {
  title: "Reset Password — ASIP",
  description: "Set a new secure password for your ASIP account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordRoute() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordView />
    </Suspense>
  );
}