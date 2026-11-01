"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  CrownIcon,
  FileTextIcon,
  LockIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/site-config";
import {
  getCustomerTier,
  useCurrentUser,
} from "@/features/authentication";
import { cn } from "@/lib/utils";
import type { CustomerTier } from "@/types";

/* -------------------------------------------------------------------------- */
/* Tier definitions                                                             */
/* -------------------------------------------------------------------------- */

interface TierRequirement {
  label: string;
  detail?: string;
}

interface TierDef {
  tier: CustomerTier | "GUEST";
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  compareLimit: string;
  accentClass: string;
  ringClass: string;
  badgeText?: string;
  badgeClass?: string;
  features: string[];
  ctaLabel: string;
  ctaVariant: "default" | "outline" | "secondary";
  ctaClass?: string;
  requirements?: TierRequirement[];
  requirementTitle?: string;
}

const TIERS: TierDef[] = [
  {
    tier: "GUEST",
    name: "Guest",
    tagline: "Public directory explorer",
    price: "Free",
    priceNote: "No account needed",
    compareLimit: "Browse only",
    accentClass: "text-muted-foreground",
    ringClass: "ring-border",
    features: [
      "Browse all listed providers",
      "View organization profiles",
      "Read public reviews",
      "Search by name & location",
    ],
    ctaLabel: "Register Free",
    ctaVariant: "outline",
  },
  {
    tier: "CUSTOMER",
    name: "Standard",
    tagline: "Registered customer account",
    price: "Free",
    priceNote: "Register with email",
    compareLimit: "Compare up to 2",
    accentClass: "text-blue-500",
    ringClass: "ring-blue-500/50",
    features: [
      "Compare 2 providers side-by-side",
      "Write & publish reviews",
      "AI-powered review summaries",
      "Report abusive content",
      "Save comparison selections",
    ],
    ctaLabel: "Register Free",
    ctaVariant: "outline",
  },
  {
    tier: "VERIFIED_CUSTOMER",
    name: "Verified",
    tagline: "Identity-verified customer",
    price: "Free",
    priceNote: "Submit verification documents",
    compareLimit: "Compare up to 4",
    accentClass: "text-emerald-500",
    ringClass: "ring-emerald-500/60",
    badgeText: "Free Verification",
    badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    features: [
      "Everything in Standard",
      "Compare up to 4 providers",
      "Verified Customer badge on reviews",
      "5-dimension detailed rating criteria",
      "Verified review weight boost",
    ],
    ctaLabel: "Apply for Verification",
    ctaVariant: "default",
    ctaClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    requirementTitle: "Verification Requirements",
    requirements: [
      {
        label: "Government-issued ID",
        detail: "National ID, passport, or driver license scan.",
      },
      {
        label: "Proof of past service usage",
        detail: "Invoice, contract, or screenshot of engagement with a listed provider.",
      },
      {
        label: "Active ASIP account",
        detail: "You must be signed in as a Standard Customer before applying.",
      },
      {
        label: "Review period: 3-5 business days",
        detail: "Our team manually verifies each submission for authenticity.",
      },
    ],
  },
  {
    tier: "PREMIUM_CUSTOMER",
    name: "Premium",
    tagline: "Enterprise-grade evaluation",
    price: "Paid",
    priceNote: "Subscription plan",
    compareLimit: "Compare up to 10",
    accentClass: "text-amber-500",
    ringClass: "ring-amber-500/60",
    badgeText: "Best Offer",
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    features: [
      "Everything in Verified",
      "Compare up to 10 providers",
      "Export CSV & PDF reports",
      "Cross-provider AI market synthesis",
      "Priority review processing",
      "Advanced competitor ranking insights",
    ],
    ctaLabel: "Upgrade to Premium",
    ctaVariant: "default",
    ctaClass: "bg-amber-500 hover:bg-amber-600 text-zinc-950",
    requirementTitle: "Premium Subscription",
    requirements: [
      {
        label: "Monthly or annual subscription",
        detail: "Flexible billing — cancel anytime.",
      },
      {
        label: "Valid payment method",
        detail: "Credit/debit card or corporate purchase order accepted.",
      },
      {
        label: "Active ASIP account",
        detail: "Standard or Verified account required to upgrade.",
      },
      {
        label: "Instant activation",
        detail: "Access unlocked immediately after payment confirmation.",
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Tier Card Component                                                          */
/* -------------------------------------------------------------------------- */

function TierCard({
  def,
  isCurrent,
  isLocked,
  onCta,
  expanded,
}: {
  def: TierDef;
  isCurrent: boolean;
  isLocked: boolean;
  onCta: () => void;
  expanded: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card transition-all duration-200",
        "ring-2",
        isCurrent ? def.ringClass : "ring-transparent",
        isCurrent && "shadow-lg",
        isLocked && "opacity-60",
      )}
    >
      {/* Top badge */}
      {def.badgeText && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span
            className={cn(
              "rounded-full border px-3 py-0.5 text-xs font-semibold",
              def.badgeClass,
            )}
          >
            {def.badgeText}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-5 p-6 pt-8">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("text-sm font-semibold", def.accentClass)}>
              {def.name}
            </span>
            {isCurrent && (
              <Badge variant="outline" className="text-[10px] font-medium shrink-0">
                Current plan
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{def.tagline}</p>
        </div>

        {/* Price */}
        <div>
          <p className="text-2xl font-bold tracking-tight">{def.price}</p>
          <p className="text-xs text-muted-foreground">{def.priceNote}</p>
        </div>

        {/* Compare limit */}
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Comparison limit
          </p>
          <p className={cn("text-sm font-bold mt-0.5", def.accentClass)}>
            {def.compareLimit}
          </p>
        </div>

        {/* Feature list */}
        <ul className="flex-1 space-y-2">
          {def.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckIcon className={cn("mt-0.5 size-3.5 shrink-0", def.accentClass)} />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isCurrent ? (
          <Button variant="outline" disabled className="w-full">
            Current Plan
          </Button>
        ) : isLocked ? (
          <Button variant="outline" disabled className="w-full opacity-40">
            <LockIcon className="size-3.5" />
            Not available
          </Button>
        ) : (
          <Button
            variant={def.ctaVariant}
            className={cn("w-full", def.ctaClass)}
            onClick={onCta}
          >
            {def.ctaLabel}
            {def.requirements && (
              <ChevronDownIcon
                className={cn(
                  "ml-1 size-3.5 transition-transform duration-200",
                  expanded && "rotate-180",
                )}
              />
            )}
          </Button>
        )}

        {/* Requirements accordion */}
        {expanded && def.requirements && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {def.requirementTitle}
            </p>
            <ul className="space-y-3">
              {def.requirements.map((req) => (
                <li key={req.label} className="space-y-0.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <FileTextIcon className="size-3 shrink-0 text-muted-foreground" />
                    {req.label}
                  </p>
                  {req.detail && (
                    <p className="pl-4 text-[11px] text-muted-foreground">{req.detail}</p>
                  )}
                </li>
              ))}
            </ul>
            {def.tier === "VERIFIED_CUSTOMER" && (
              <Button size="sm" variant="outline" className="mt-2 w-full" asChild>
                <Link href={ROUTES.profile}>Go to my profile to apply</Link>
              </Button>
            )}
            {def.tier === "PREMIUM_CUSTOMER" && (
              <Button
                size="sm"
                className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-zinc-950"
                asChild
              >
                <Link href={ROUTES.profile}>Subscribe via my profile</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                         */
/* -------------------------------------------------------------------------- */

export default function UpgradePage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const currentTier = getCustomerTier(user);
  const [expandedTier, setExpandedTier] = useState<CustomerTier | null>(null);

  const TIER_ORDER: Array<CustomerTier | "GUEST"> = [
    "GUEST",
    "CUSTOMER",
    "VERIFIED_CUSTOMER",
    "PREMIUM_CUSTOMER",
  ];

  const currentIndex = TIER_ORDER.indexOf(currentTier);

  function handleCta(def: TierDef) {
    if (def.tier === "GUEST" || def.tier === "CUSTOMER") {
      router.push(ROUTES.register);
      return;
    }
    setExpandedTier((prev) =>
      prev === (def.tier as CustomerTier) ? null : (def.tier as CustomerTier),
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-6 py-14 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-10 right-1/4 size-80 rounded-full bg-amber-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl space-y-4 text-center">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <SparklesIcon className="size-3.5" />
              Unlock More Comparisons
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Choose the right plan for your needs
          </h1>
          <p className="mx-auto max-w-xl text-sm text-zinc-400">
            Compare service providers side-by-side. Upgrade your account to evaluate
            more options and make smarter procurement decisions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-6 top-6 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeftIcon className="size-3.5" />
          Go back
        </button>
      </div>

      {/* Cards */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((def) => {
            const tierIndex = TIER_ORDER.indexOf(def.tier);
            const isCurrent = def.tier === currentTier;
            const isLocked = tierIndex < currentIndex && !isCurrent;
            const isExpanded = expandedTier === def.tier;

            return (
              <TierCard
                key={def.tier}
                def={def}
                isCurrent={isCurrent}
                isLocked={isLocked}
                onCta={() => handleCta(def)}
                expanded={isExpanded}
              />
            );
          })}
        </div>

        {/* Guest sign-in nudge */}
        {currentTier === "GUEST" && (
          <div className="mt-8 rounded-xl border border-border bg-muted/40 p-6 text-center space-y-3">
            <p className="text-sm font-medium">Already have an account?</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" asChild>
                <Link href={ROUTES.login}>Sign in</Link>
              </Button>
              <Button asChild>
                <Link href={ROUTES.register}>Register free</Link>
              </Button>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          All plans include full access to the provider directory, AI search, and
          public reviews. Verification and premium tiers unlock deeper evaluation tools.
        </p>
      </div>
    </div>
  );
}
