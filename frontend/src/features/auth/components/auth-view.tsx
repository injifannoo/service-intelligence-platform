"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Page, inputCls, btnPrimary } from "@/components/shared/site";

export function AuthView() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const { user, signIn, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.push(redirect);
  }, [user, redirect, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        await signIn(email, password);
        toast.success("Welcome back");
      } else if (mode === "up") {
        await signUp(name, email, password);
        await signIn(email, password);
        toast.success("Account created");
      } else {
        toast.info("Password reset instructions sent if the account exists.");
        setMode("in");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-2">
        <div>
          <p className="eyebrow text-primary">ASIP account</p>
          <h1 className="mt-3 text-5xl">
            {mode === "up"
              ? "Create your account"
              : mode === "forgot"
                ? "Reset password"
                : "Welcome back"}
          </h1>
          <p className="mt-4 text-muted-foreground">
            Customers write verified reviews and save comparisons. Organizations claim a profile,
            manage services and see AI insights.
          </p>
          <div className="mt-6 rounded-md border bg-muted/40 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Seeded demo accounts (Password123!):</p>
            <p className="mt-1">Customer: customer@asip.dev · Verified: verified@asip.dev</p>
            <p>Organization Owner: owner@asip.dev · Admin: admin@asip.dev</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-card">
          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && (
              <input
                required
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className={inputCls}
              />
            )}
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={inputCls}
            />
            {mode !== "forgot" && (
              <input
                required
                name="password"
                minLength={8}
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={inputCls}
              />
            )}
            <button disabled={busy} className={`${btnPrimary} w-full py-2.5`}>
              {busy
                ? "Please wait..."
                : mode === "in"
                  ? "Sign in"
                  : mode === "up"
                    ? "Create account"
                    : "Send reset link"}
            </button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            {mode === "in" ? (
              <button
                type="button"
                onClick={() => setMode("up")}
                className="text-primary hover:underline"
              >
                Create account
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("in")}
                className="text-primary hover:underline"
              >
                Back to sign in
              </button>
            )}
            {mode === "in" && (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-muted-foreground hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            By continuing you agree that reviews must reflect genuine experiences.{" "}
            <Link href="/" className="underline">
              Home
            </Link>
          </p>
        </div>
      </div>
    </Page>
  );
}