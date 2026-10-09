"use client";

import Link from "next/link";
import { Building2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/site-config";
import { useAuthModal, useCurrentUser } from "@/features/authentication";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * Secondary hero call to action.
 *
 * "Register a business" is an acquisition prompt, so it only makes sense to a
 * signed-out visitor — sending an existing account back to `/register` is a dead
 * end now that registration signs you straight in. A signed-in visitor gets the
 * organization directory instead, which is the action they can actually take.
 */
export function HeroSecondaryCta({ label = "Register a business" }: { label?: string }) {
  const { data: user } = useCurrentUser();
  const { openAuthModal } = useAuthModal();
  const hydrated = useHydrated();

  // `user` comes from a cookie-backed client-only query, so the server always
  // renders the signed-out variant. Trusting `user` before hydration would hand
  // React a different tree than the HTML it is hydrating against.
  if (hydrated && user) {
    return (
      <Button asChild size="lg" variant="outline">
        <Link href={ROUTES.organizations}>
          <Building2Icon aria-hidden="true" />
          Your organizations
        </Link>
      </Button>
    );
  }

  return (
    <Button size="lg" variant="outline" onClick={() => openAuthModal("signup")}>
      {label}
    </Button>
  );
}
