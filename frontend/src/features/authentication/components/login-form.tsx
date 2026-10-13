"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AlertMessage } from "@/components/shared/alert-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ADMIN_ROLES, landingRouteForRole, ROUTES, safeNextPath } from "@/config/site-config";
import { ApiError } from "@/lib/api-client";
import type { UserRole } from "@/types";

import { useLogin } from "../api/use-auth";

type LoginFormProps = {
  onSuccess?: () => void;
  onSwitchMode?: () => void;
};

/**
 * Guards a `?next=` destination against the signed-in user's role.
 *
 * The proxy sends everyone to `/login?next=…` without knowing who they are, so a
 * customer can land on `?next=/admin/users` and be returned into an area they
 * cannot enter. Only `/admin` needs checking; every other guarded area is
 * available to any signed-in account.
 *
 * The segment boundary matters: a bare `startsWith("/admin")` would also match
 * `/administrators` and lock a customer out of an unrelated path.
 */
function canVisit(role: UserRole, path: string): boolean {
  if (path !== ROUTES.admin && !path.startsWith(`${ROUTES.admin}/`)) return true;
  return ADMIN_ROLES.includes(role);
}

/**
 * @param onSuccess  Called after a successful sign-in. The auth modal uses it to
 *   close itself; on the standalone `/login` page there is nothing to close.
 * @param onSwitchMode  Replaces the "No account yet? Register" link. The modal
 *   passes a callback so the switch happens in place instead of navigating away
 *   from the homepage; the standalone page leaves it undefined and keeps the link.
 */
export function LoginForm({ onSuccess, onSwitchMode }: LoginFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // The proxy sends a signed-out visitor here with `?next=` so they land back on
  // the page they originally asked for. It is validated rather than trusted
  // because it is attacker-controllable and becomes a redirect target.
  const next = safeNextPath(searchParams.get("next"));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    try {
      const user = await login.mutateAsync({ email, password });
      // `next` wins over the role landing, but only for admins: a customer who
      // was bounced off `/admin` must not be sent back into a 403.
      const destination = next && canVisit(user.role, next)
        ? next
        : landingRouteForRole(user.role);
      router.push(destination);
      onSuccess?.();
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

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

      <Field id="password" label="Password" errors={fieldErrors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <Button type="submit" className="w-full" size="lg" loading={login.isPending}>
        {login.isPending ? "Signing in" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account yet?{" "}
        {onSwitchMode ? (
          <button
            type="button"
            onClick={onSwitchMode}
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Register
          </button>
        ) : (
          <Link
            href={ROUTES.register}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Register
          </Link>
        )}
      </p>
    </form>
  );
}
