"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Page, inputCls, btnPrimary, btnGhost } from "@/components/shared/site";

export function AuthView() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const { user } = useAuth();
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        setMode("in");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent to your email.");
        setMode("in");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${redirect}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error((err as Error).message);
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
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-card">
          {mode !== "forgot" && (
            <>
              <button onClick={google} className={`${btnGhost} w-full`}>
                Continue with Google
              </button>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}
          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && (
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className={inputCls}
              />
            )}
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={inputCls}
            />
            {mode !== "forgot" && (
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={inputCls}
              />
            )}
            <button disabled={busy} className={`${btnPrimary} w-full py-2.5`}>
              {busy
                ? "Please wait…"
                : mode === "in"
                  ? "Sign in"
                  : mode === "up"
                    ? "Create account"
                    : "Send reset link"}
            </button>
          </form>
          <div className="mt-4 flex justify-between text-sm">
            {mode === "in" ? (
              <button onClick={() => setMode("up")} className="text-primary hover:underline">
                Create account
              </button>
            ) : (
              <button onClick={() => setMode("in")} className="text-primary hover:underline">
                Back to sign in
              </button>
            )}
            {mode === "in" && (
              <button
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
