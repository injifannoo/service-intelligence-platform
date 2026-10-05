import type { Metadata } from "next";

import { LoginForm } from "@/features/authentication";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sign in to manage your organizations and insights.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
