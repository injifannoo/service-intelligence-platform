import type { Metadata } from "next";
import { Suspense } from "react";

import { BusinessRegisterForm } from "@/features/authentication";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Register your business",
};

export default function BusinessRegisterPage() {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Register your business
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Create an owner account, then add your business profile. New profiles
          start as pending until our team verifies them.
        </p>
      </div>

      {/* BusinessRegisterForm reads `?next=` through RegisterForm, which needs
          the Suspense boundary for static prerendering. */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <BusinessRegisterForm />
      </Suspense>
    </div>
  );
}
