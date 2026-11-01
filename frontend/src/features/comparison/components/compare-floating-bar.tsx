"use client";

import { useRouter } from "next/navigation";
import { ArrowRightIcon, ScaleIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/site-config";
import {
  getCustomerPermissions,
  getCustomerTier,
  useCurrentUser,
} from "@/features/authentication";
import { useOrganizationUiStore } from "@/features/organizations/store/organization-store";

export function CompareFloatingBar() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const selectedIds = useOrganizationUiStore((state) => state.selectedIds);
  const clearSelection = useOrganizationUiStore((state) => state.clearSelection);

  if (selectedIds.length === 0) {
    return null;
  }

  const customerTier = getCustomerTier(user);
  const permissions = getCustomerPermissions(customerTier);
  const maxAllowed = permissions.canCompare ? permissions.maxComparisonCount : 0;
  const isGuest = !permissions.canCompare;
  const hasMinimum = selectedIds.length >= 2;

  function handleCompareNow() {
    if (isGuest) {
      router.push(`/login?next=/comparison?orgs=${selectedIds.join(",")}`);
      return;
    }
    if (!hasMinimum) return;
    router.push(`/comparison?orgs=${selectedIds.join(",")}`);
  }

  return (
    <div
      role="region"
      aria-label="Comparison selection"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border/80 bg-zinc-950/95 px-4 py-2.5 text-white shadow-2xl backdrop-blur-md transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-900/95"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <ScaleIcon className="size-4 text-[#e2d5bd]" aria-hidden="true" />
        <span>
          <span className="tabular-nums font-semibold">{selectedIds.length}</span>
          {permissions.canCompare ? `/${maxAllowed}` : ""} selected
        </span>
      </div>

      <div className="h-4 w-px bg-white/20" aria-hidden="true" />

      {isGuest ? (
        <Button
          size="sm"
          onClick={handleCompareNow}
          className="rounded-full bg-[#E8DCC4] text-xs font-semibold text-zinc-950 hover:bg-[#decfae]"
        >
          Sign in to compare
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={!hasMinimum}
          onClick={handleCompareNow}
          className="rounded-full bg-[#E8DCC4] text-xs font-semibold text-zinc-950 hover:bg-[#decfae] disabled:opacity-50"
        >
          {hasMinimum ? "Compare now" : "Select at least 2"}
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </Button>
      )}

      <button
        type="button"
        onClick={clearSelection}
        aria-label="Clear selection"
        className="ml-1 rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}
