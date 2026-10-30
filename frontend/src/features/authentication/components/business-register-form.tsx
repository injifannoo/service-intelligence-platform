"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/config/site-config";
import { useHydrated } from "@/lib/use-hydrated";

import { useCurrentUser } from "../api/use-auth";
import { RegisterForm } from "./register-form";

/**
 * Business signup, step 1 of the guided onboarding (docs/09:256-278).
 *
 * A visitor with no session creates an owner account here and is sent straight
 * into the organization profile step. A visitor who already has a session is not
 * shown a second signup form: an account without an organization continues to
 * onboarding, and one that already manages an organization goes to the directory.
 *
 * The redirect is client-side because the access token lives in a cookie the
 * server cannot read, so the server render and hydration pass must both show the
 * signup form for the same markup.
 */
export function BusinessRegisterForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { data: user } = useCurrentUser();

  const isSignedIn = hydrated && Boolean(user);

  useEffect(() => {
    if (!isSignedIn || !user) return;
    router.replace(
      user.organization_id ? ROUTES.organizations : ROUTES.businessOnboarding,
    );
  }, [isSignedIn, user, router]);

  // Render nothing once a session is visible, so the signup form does not flash
  // for a visitor who already has an account and is being redirected.
  if (isSignedIn) return null;

  return <RegisterForm redirectTo={ROUTES.businessOnboarding} />;
}
