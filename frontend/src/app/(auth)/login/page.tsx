import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/features/authentication";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sign in to manage your organizations and insights.
        </p>
      </div>

      {/* The form reads `?next=` to return the visitor to the page that bounced
          them here, which opts it into a client-side bailout. Without this
          boundary `next build` fails to prerender /login. */}
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
