"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MailCheckIcon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/config/site-config";
import { ApiError } from "@/lib/api-client";

import { useRegister } from "../api/use-auth";
import { useAuthUiStore } from "../store/auth-store";

export function RegisterForm() {
  const register = useRegister();
  const pendingEmail = useAuthUiStore((state) => state.pendingVerificationEmail);
  const setPendingEmail = useAuthUiStore(
    (state) => state.setPendingVerificationEmail,
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // docs/02_Product_Requirements.md:137 lists email verification in scope, so
  // registration is treated as a two-step flow rather than an immediate login.
  if (pendingEmail) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-success-subtle text-success">
          <MailCheckIcon className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">Verify your email</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">{pendingEmail}</span>.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href={ROUTES.login}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    try {
      await register.mutateAsync({ name, email, password });
      setPendingEmail(email);
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

      <Button type="submit" className="w-full" size="lg" loading={register.isPending}>
        {register.isPending ? "Creating account" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link
          href={ROUTES.login}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
