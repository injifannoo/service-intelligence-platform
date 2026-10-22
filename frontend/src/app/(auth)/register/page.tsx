import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { RegisterForm } from "@/features/authentication";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/site-config";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Join as a customer, or register a business to manage its profile.
        </p>
      </div>

      {/* Reads `?next=` so a bounced visitor returns to where they were going,
          which needs the Suspense boundary for static prerendering. */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RegisterForm />
      </Suspense>

      <p className="border-t border-border pt-5 text-center text-sm text-muted-foreground">
        Own a business?{" "}
        <Link
          href={ROUTES.businessRegister}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Register your business
        </Link>
      </p>
    </div>
  );
}
