"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { landingRouteForRole } from "@/config/site-config";
import { useAuthModal, useCurrentUser } from "@/features/authentication";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Closing call-to-action pair.
 *
 * "Create your account" tells a signed-in visitor to do something they have
 * already done, and following it would create a duplicate account. Both pieces
 * swap to the equivalent action for an existing session.
 */
export function ClosingPrimaryCta() {
  const { data: user } = useCurrentUser();
  const { openAuthModal } = useAuthModal();
  const hydrated = useHydrated();

  // Cookie-backed session state is invisible to the server, so the first render
  // must use the signed-out variant on both sides or hydration is discarded.
  if (hydrated && user) {
    return (
      <Button asChild size="lg">
        <Link href={landingRouteForRole(user.role)}>
          Go to your dashboard
          <ArrowRightIcon />
        </Link>
      </Button>
    );
  }

  return (
    <Button size="lg" onClick={() => openAuthModal("signup")}>
      Create your account
      <ArrowRightIcon />
    </Button>
  );
}

export function ClosingCtaCopy() {
  const { data: user } = useCurrentUser();
  const hydrated = useHydrated();

  // See ClosingPrimaryCta: the server cannot know a session exists, so both the
  // server render and the hydration render use the signed-out copy.
  if (hydrated && user) {
    return "Pick up where you left off, or keep browsing providers you have not compared yet.";
  }

  return "Create an account to save your shortlist, register a business, or request verification.";
}
