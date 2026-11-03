"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CrownIcon, ShieldCheckIcon, SparklesIcon, UsersIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/site-config";
import {
  getCustomerPermissions,
  getCustomerTier,
  useCurrentUser,
} from "@/features/authentication";
import { useOrganizationUiStore } from "@/features/organizations/store/organization-store";
import { apiClient } from "@/lib/api-client";
import type { CustomerTier, UserProfile } from "@/types";

export function ComparisonUpgradeModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const isOpen = useOrganizationUiStore((state) => state.isUpgradeModalOpen);
  const closeModal = useOrganizationUiStore((state) => state.closeUpgradeModal);

  const [isUpgrading, setIsUpgrading] = useState(false);

  const currentTier = getCustomerTier(user);
  const permissions = getCustomerPermissions(currentTier);

  async function handleSimulateUpgrade(targetTier: CustomerTier) {
    if (!user) {
      closeModal();
      router.push(ROUTES.login);
      return;
    }

    setIsUpgrading(true);
    try {
      await apiClient.put<UserProfile>("/users/profile/", {
        name: user.name,
        email: user.email,
        customer_tier: targetTier,
      });
      void queryClient.invalidateQueries({ queryKey: ["auth"] });
      closeModal();
    } catch {
      // Handle gracefully
    } finally {
      setIsUpgrading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <SparklesIcon className="size-5" />
            </span>
            <div>
              <DialogTitle>
                {!user
                  ? "Sign in to compare providers"
                  : currentTier === "VERIFIED_CUSTOMER"
                    ? "Upgrade to compare up to 10 providers"
                    : "Compare more than 2 providers"}
              </DialogTitle>
              <DialogDescription>
                {!user
                  ? "Create a free account to unlock side-by-side comparison matrices."
                  : `You are currently on the ${permissions.badgeLabel} tier.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!user ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm space-y-2">
              <p className="font-medium text-foreground">Registered accounts receive:</p>
              <ul className="space-y-1.5 text-muted-foreground text-xs">
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-emerald-600" />
                  Compare up to 2 providers side-by-side
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-emerald-600" />
                  Write and publish verified customer reviews
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-emerald-600" />
                  Access AI-powered review summaries
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild onClick={closeModal}>
                <Link href={ROUTES.login}>Sign in</Link>
              </Button>
              <Button asChild onClick={closeModal}>
                <Link href={ROUTES.register}>Register free account</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Expand your evaluation capacity with an earned verification or an enterprise subscription:
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Option A: Verified Customer */}
              {currentTier === "CUSTOMER" && (
                <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheckIcon className="size-4 text-emerald-600" />
                        <h3 className="font-semibold text-sm">Verified Customer</h3>
                      </div>
                      <Badge variant="success" className="text-[10px]">Free</Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      For corporate procurement teams and clients with proof of past service.
                    </p>

                    <ul className="space-y-1 text-xs text-muted-foreground pt-1">
                      <li className="flex items-center gap-1.5">
                        <CheckIcon className="size-3.5 text-emerald-600" />
                        Compare up to <strong>4 providers</strong>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckIcon className="size-3.5 text-emerald-600" />
                        Verified review badge on profile
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckIcon className="size-3.5 text-emerald-600" />
                        Full 5-dimension rating criteria
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={isUpgrading}
                      onClick={() => handleSimulateUpgrade("VERIFIED_CUSTOMER")}
                    >
                      Apply for Verification
                    </Button>
                  </div>
                </div>
              )}

              {/* Option B: Premium Customer */}
              <div
                className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                  currentTier === "VERIFIED_CUSTOMER"
                    ? "sm:col-span-2 border-primary/50 bg-primary/5"
                    : "border-primary/30 bg-card hover:border-primary"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CrownIcon className="size-4 text-amber-500" />
                      <h3 className="font-semibold text-sm">Premium Enterprise</h3>
                    </div>
                    <Badge variant="accent" className="text-[10px]">Enterprise</Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    For enterprise buyers, analysts, and organizations conducting multi-vendor RFPs.
                  </p>

                  <ul className="space-y-1 text-xs text-muted-foreground pt-1">
                    <li className="flex items-center gap-1.5">
                      <CheckIcon className="size-3.5 text-primary" />
                      Compare up to <strong>10 providers</strong>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckIcon className="size-3.5 text-primary" />
                      <strong>Export CSV & PDF</strong> comparison reports
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckIcon className="size-3.5 text-primary" />
                      Cross-provider AI market synthesis
                    </li>
                  </ul>
                </div>

                <div className="pt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={isUpgrading}
                    onClick={() => handleSimulateUpgrade("PREMIUM_CUSTOMER")}
                  >
                    Upgrade to Premium
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
