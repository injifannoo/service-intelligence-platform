import type { Metadata } from "next";
import { Suspense } from "react";

import { RegisterForm } from "@/features/authentication";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Join as a customer, or register a business to manage its profile.
        </p>
      </div>

      {/* Reads `?next=` so a bounced visitor returns to where they were going,
          which needs the Suspense boundary for static prerendering. */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
