"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, CheckIcon, CrownIcon, ShieldCheckIcon, UserRoundIcon, XIcon } from "lucide-react";

import { ApiError, apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertMessage } from "@/components/shared/alert-message";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CUSTOMER_TIERS,
  CUSTOMER_TIER_LABELS,
  USER_ROLE_LABELS,
  type CustomerTier,
  type UserProfile,
} from "@/types";

import { useCurrentUser } from "../api/use-auth";
import { getCustomerPermissions, getCustomerTier } from "../permissions";

/**
 * Editable form.
 */
function ProfileForm({ user }: { user: UserProfile }) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);

  const updateProfile = useMutation({
    mutationFn: (payload: { name: string; email: string; customer_tier?: CustomerTier }) =>
      apiClient.put<UserProfile>("/users/profile/", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth"] });
      setFormError(null);
      setFieldErrors({});
      setSaved(true);
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSaved(false);

    try {
      await updateProfile.mutateAsync({ name, email });
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
    <form onSubmit={handleSubmit} className="max-w-md space-y-4" noValidate>
      {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

      {saved && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <CheckCircle2Icon className="size-4 shrink-0" />
          Profile updated.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="profile-name">Full name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name?.map((message) => (
          <p key={message} className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
        />
        {fieldErrors.email?.map((message) => (
          <p key={message} className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </div>

      <Button type="submit" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

/**
 * Blueprint §5 Customer Persona Tiers & Permissions Matrix.
 */
function CustomerTiersMatrix({
  activeTier,
  onSwitchTier,
  isSwitching,
}: {
  activeTier: CustomerTier;
  onSwitchTier: (tier: CustomerTier) => void;
  isSwitching: boolean;
}) {
  const currentPermissions = getCustomerPermissions(activeTier);

  const capabilities = [
    {
      label: "Browse & Search Providers",
      guest: true,
      customer: true,
      verified: true,
      premium: true,
    },
    {
      label: "Write Reviews & Ratings",
      guest: false,
      customer: true,
      verified: true,
      premium: true,
    },
    {
      label: "Verified Customer Review Badge",
      guest: false,
      customer: false,
      verified: true,
      premium: true,
    },
    {
      label: "Detailed 5-Dimension Rating Criteria",
      guest: false,
      customer: false,
      verified: true,
      premium: true,
    },
    {
      label: "AI Review Summaries",
      guest: false,
      customer: true,
      verified: true,
      premium: true,
    },
    {
      label: "Max Comparison Slots",
      guest: "Preview only",
      customer: "2 providers",
      verified: "4 providers",
      premium: "Unlimited (10+)",
    },
    {
      label: "AI Deep Comparison Synthesis",
      guest: false,
      customer: false,
      verified: false,
      premium: true,
    },
    {
      label: "Export Comparison (CSV / PDF)",
      guest: false,
      customer: false,
      verified: false,
      premium: true,
    },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Blueprint §5 — Customer Tiers & Visible Permissions</CardTitle>
            <CardDescription>
              4 Customer Tiers with graduated visible actions and platform permissions.
            </CardDescription>
          </div>
          <Badge variant={currentPermissions.badgeVariant} className="px-3 py-1 font-semibold">
            {activeTier === "PREMIUM_CUSTOMER" && <CrownIcon className="mr-1 size-3" />}
            {activeTier === "VERIFIED_CUSTOMER" && <ShieldCheckIcon className="mr-1 size-3" />}
            Current: {currentPermissions.badgeLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Interactive tier demo switcher */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase">
            Switch Customer Tier (Demo):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {CUSTOMER_TIERS.filter((t) => t !== "GUEST").map((tier) => (
              <Button
                key={tier}
                size="sm"
                variant={activeTier === tier ? "default" : "outline"}
                disabled={isSwitching}
                onClick={() => onSwitchTier(tier)}
                className="h-8 text-xs font-medium"
              >
                {CUSTOMER_TIER_LABELS[tier]}
              </Button>
            ))}
          </div>
        </div>

        {/* Matrix table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/60 text-muted-foreground">
              <tr>
                <th className="p-3 font-semibold">Capability</th>
                <th className={`p-3 font-semibold ${activeTier === "GUEST" ? "bg-primary/10 text-primary" : ""}`}>
                  Guest
                </th>
                <th className={`p-3 font-semibold ${activeTier === "CUSTOMER" ? "bg-primary/10 text-primary" : ""}`}>
                  Customer
                </th>
                <th className={`p-3 font-semibold ${activeTier === "VERIFIED_CUSTOMER" ? "bg-primary/10 text-primary" : ""}`}>
                  Verified Customer
                </th>
                <th className={`p-3 font-semibold ${activeTier === "PREMIUM_CUSTOMER" ? "bg-primary/10 text-primary" : ""}`}>
                  Premium Customer
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {capabilities.map((row, index) => (
                <tr key={index} className="hover:bg-muted/30">
                  <td className="p-3 font-medium text-foreground">{row.label}</td>
                  <td className={`p-3 ${activeTier === "GUEST" ? "bg-primary/5 font-semibold" : ""}`}>
                    {renderCell(row.guest)}
                  </td>
                  <td className={`p-3 ${activeTier === "CUSTOMER" ? "bg-primary/5 font-semibold" : ""}`}>
                    {renderCell(row.customer)}
                  </td>
                  <td className={`p-3 ${activeTier === "VERIFIED_CUSTOMER" ? "bg-primary/5 font-semibold" : ""}`}>
                    {renderCell(row.verified)}
                  </td>
                  <td className={`p-3 ${activeTier === "PREMIUM_CUSTOMER" ? "bg-primary/5 font-semibold" : ""}`}>
                    {renderCell(row.premium)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function renderCell(val: boolean | string) {
  if (typeof val === "string") {
    return <span className="text-muted-foreground">{val}</span>;
  }
  return val ? (
    <CheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
  ) : (
    <XIcon className="size-4 text-muted-foreground/40" />
  );
}

/**
 * Profile view, docs/05_API_Design.md:250-268.
 */
export function ProfilePanel() {
  const queryClient = useQueryClient();
  const { data: user, isPending, isError, error } = useCurrentUser();

  const switchTierMutation = useMutation({
    mutationFn: (tier: CustomerTier) =>
      apiClient.put<UserProfile>("/users/profile/", {
        name: user?.name ?? "",
        email: user?.email ?? "",
        customer_tier: tier,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  if (isError || !user) {
    return (
      <AlertMessage tone="error">
        {error instanceof Error ? error.message : "Failed to load your profile."}
      </AlertMessage>
    );
  }

  const activeTier = getCustomerTier(user);
  const tierPermissions = getCustomerPermissions(activeTier);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted">
            <UserRoundIcon className="size-5 text-muted-foreground" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{user.name}</p>
              <Badge variant={tierPermissions.badgeVariant}>
                {tierPermissions.badgeLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {USER_ROLE_LABELS[user.role]} &bull; {user.email}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Blueprint §5 Customer Tiers & Permissions Matrix */}
      <CustomerTiersMatrix
        activeTier={activeTier}
        onSwitchTier={(tier) => switchTierMutation.mutate(tier)}
        isSwitching={switchTierMutation.isPending}
      />

      <Separator />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Account Details</h2>
        <ProfileForm key={user.id} user={user} />
      </div>

      {user.organization_id && (
        <>
          <Separator />
          <p className="text-sm text-muted-foreground">
            You manage the organization shown on your{" "}
            <a
              href={`/organizations/${user.organization_id}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              public profile
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
