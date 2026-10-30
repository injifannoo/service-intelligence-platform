"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2Icon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { landingRouteForRole, ROUTES, safeNextPath } from "@/config/site-config";
import { ApiError } from "@/lib/api-client";

import { useLogin, useRegister } from "../api/use-auth";

type RegisterFormProps = {
  onSuccess?: () => void;
  onSwitchMode?: () => void;
  /**
   * Where to send a newly created account once it is signed in. Defaults to the
   * role landing; the business signup passes the organization onboarding step so
   * a business continues into its profile instead of the customer directory.
   * `?next=` still wins, so a bounced visitor is returned to where they were going.
   */
  redirectTo?: string;
};

/**
 * @param onSuccess  Called once the new account is signed in and the router has
 *   been sent to their landing page. The auth modal uses it to close itself.
 * @param onSwitchMode  Replaces the "Already registered? Sign in" link and the
 *   post-registration fallback button, so the modal switches in place instead of
 *   navigating away from the homepage.
 * @param redirectTo  Overrides the post-sign-in destination for flows like
 *   business onboarding. Ignored when `?next=` is present.
 */
export function RegisterForm({ onSuccess, onSwitchMode, redirectTo }: RegisterFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useRegister();
  const login = useLogin();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const next = safeNextPath(searchParams.get("next"));
  const pending = register.isPending || login.isPending;

  /*
   * docs/02_Product_Requirements.md:139 lists email verification as in scope, but
   * there is no verification endpoint, no mail delivery, and no `email_verified`
   * field on the user in docs/05_API_Design.md or the dev backend. The previous
   * "check your inbox" step therefore promised something the system cannot do and
   * left a brand-new user with no way forward.
   *
   * Since registration already returns only `{ message }` per docs/05:157-163, the
   * form signs the new account straight in using the password just chosen. The
   * credentials are already in hand, so this needs no backend change and no
   * unverifiable claim. Email verification should be added here as a real gated
   * step when the backend supports it.
   */
  if (createdEmail) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-success-subtle text-success">
          <CheckCircle2Icon className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">Account created</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{createdEmail}</span> is ready. Sign
            in to continue.
          </p>
        </div>
        {onSwitchMode ? (
          <Button variant="outline" className="w-full" onClick={onSwitchMode}>
            Go to sign in
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link href={ROUTES.login}>Go to sign in</Link>
          </Button>
        )}
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setCreatedEmail(null);

    try {
      await register.mutateAsync({ name, email, password });
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      return;
    }

    // The account exists from here on, so a failure below is no longer a
    // registration problem. Retrying the whole submit would then fail on
    // "email already exists", so the user is routed to sign in instead.
    try {
      const user = await login.mutateAsync({ email, password });
      router.push(next ?? redirectTo ?? landingRouteForRole(user.role));
      onSuccess?.();
    } catch {
      setCreatedEmail(email);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

      <Field id="name" label="Full name" errors={fieldErrors.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          placeholder="Jordan Ellis"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field id="email" label="Email" errors={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field
        id="password"
        label="Password"
        errors={fieldErrors.password}
        hint="At least 8 characters."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <Button type="submit" className="w-full" size="lg" loading={pending}>
        {pending ? "Creating account" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        {onSwitchMode ? (
          <button
            type="button"
            onClick={onSwitchMode}
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign in
          </button>
        ) : (
          <Link
            href={ROUTES.login}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        )}
      </p>
    </form>
  );
}
