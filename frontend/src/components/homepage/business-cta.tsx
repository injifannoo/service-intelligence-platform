"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { landingRouteForRole, ROUTES } from "@/config/site-config";
import { useCurrentUser } from "@/features/authentication";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * "Grow Your Business" call to action.
 *
 * Mirrors `HeroSecondaryCta` but keeps the solid primary treatment the brief
 * calls for. Cookie-backed session state is invisible to the server, so the
 * signed-out variant is rendered on both the server and the hydration pass.
 */
export function GrowBusinessCta() {
  const { data: user } = useCurrentUser();
  const hydrated = useHydrated();

  if (hydrated && user) {
    return (
      <Button asChild size="lg">
        <Link href={landingRouteForRole(user.role)}>
          Open your dashboard
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      </Button>
    );
  }

  return (
    <Button asChild size="lg">
      <Link href={ROUTES.businessRegister}>
        Grow Your Business
        <ArrowRightIcon aria-hidden="true" />
      </Link>
    </Button>
  );
}

/** Outlined white action used on the solid blue closing band. */
export function JoinBusinessCta() {
  const { data: user } = useCurrentUser();
  const hydrated = useHydrated();

  if (hydrated && user) {
    return (
      <Button asChild size="lg" variant="outline">
        <Link href={ROUTES.organizations}>Your organizations</Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      size="lg"
      variant="outline"
      className="!border-white/60 !bg-transparent !text-white shadow-none hover:!bg-white/10 hover:!text-white"
    >
      <Link href={ROUTES.businessRegister}>Join as a Business</Link>
    </Button>
  );
}
