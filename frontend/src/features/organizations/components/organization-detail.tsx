"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, BarChartIcon, ExternalLinkIcon, MapPinIcon, PencilIcon, PlusIcon, ShieldCheckIcon } from "lucide-react";

import { ReviewForm, ReviewList, StarRating } from "@/features/reviews";
import { ServiceForm, useDeleteService } from "@/features/services";
import { useCurrentUser } from "@/features/authentication";
import { VerificationClaimForm } from "@/features/verification";
import { AlertMessage } from "@/components/shared/alert-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/lib/use-hydrated";
import { VERIFICATION_STATUS_LABELS, type Service } from "@/types";

import { ServiceList } from "@/features/services";

import { useOrganization } from "../api/use-organization";
import { useOrganizationUiStore } from "../store/organization-store";
import { OrganizationForm } from "./organization-form";
import { ReviewSummaryCard } from "./review-summary-card";

/**
 * Organization detail.
 *
 * Composes the services, reviews, and verification slices rather than
 * reimplementing them, so each domain keeps ownership of its own API calls
 * (docs/07_Project_Structure.md:218).
 */
export function OrganizationDetail({ organizationId }: { organizationId: string }) {
  const { data: organization, isPending, isError, error } =
    useOrganization(organizationId);
  const { data: currentUser, isFetching: isUserFetching } = useCurrentUser();
  const hydrated = useHydrated();
  const deleteService = useDeleteService(organizationId);
  const [isServiceFormOpen, setServiceFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const openEditForm = useOrganizationUiStore((state) => state.openEditForm);

  /*
   * The profile is browsable without a session, but writing a review and
   * generating the AI summary both hit authenticated endpoints. `signedIn`
   * gates those; `resolvingSession` covers the window where a session cookie
   * exists but the profile request has not settled yet — rendering the sign-in
   * prompt there would flash for a user who is already signed in.
   */
  const signedIn = Boolean(currentUser);
  const resolvingSession = hydrated && !signedIn && isUserFetching;

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError || !organization) {
    return (
      <div className="space-y-4">
        <AlertMessage tone="error" title="Organization not found">
          {error instanceof Error ? error.message : "This organization is unavailable."}
        </AlertMessage>
        <Button variant="outline" size="sm" asChild>
          <Link href="/organizations">
            <ArrowLeftIcon />
            Back to organizations
          </Link>
        </Button>
      </div>
    );
  }

  // Ownership is derived from the profile's organization link because
  // docs/04 declares no owner column on Organization — see src/types/index.ts
  // contradiction 5. The link, not the role, is the source of truth: creating an
  // organization also promotes the account to ORGANIZATION_OWNER, but this gate
  // stays on the link so it can never disagree with the tenant boundary.
  // Mirrors the BFF gate exactly: ownership via the profile link, or an admin
  // role. Ownership is the check, not the ORGANIZATION_OWNER role, because a
  // user who registered an organization while still a CUSTOMER owns it.
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";
  const isOwner =
    isAdmin || currentUser?.organization_id === organization.id;

  return (
    <div className="space-y-10">
      {/* Hero card. The gradient wash anchors the page and makes the
          verification badge feel like a status, not a stray chip. */}
      <header className="surface-gradient rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            {organization.industry && (
              <Badge variant="outline">{organization.industry.name}</Badge>
            )}
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {organization.name}
            </h1>
          </div>

          {organization.verification_status === "VERIFIED" ? (
            <Badge variant="success" className="px-3 py-1 text-sm">
              <ShieldCheckIcon />
              {VERIFICATION_STATUS_LABELS.VERIFIED}
            </Badge>
          ) : (
            <Badge variant="warning" className="px-3 py-1 text-sm">
              {VERIFICATION_STATUS_LABELS[organization.verification_status]}
            </Badge>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-2">
            <StarRating rating={organization.rating} />
            {organization.rating !== null && (
              <span className="font-medium tabular-nums">
                {organization.rating.toFixed(1)}
              </span>
            )}
          </span>

          {organization.review_count !== undefined && (
            <span className="text-muted-foreground">
              {organization.review_count} review
              {organization.review_count === 1 ? "" : "s"}
            </span>
          )}

          {organization.location && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPinIcon className="size-3.5" aria-hidden="true" />
              {organization.location}
            </span>
          )}

          {organization.website && (
            <a
              href={organization.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
            >
              <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
              Website
            </a>
          )}
        </div>

        {organization.description && (
          <p className="mt-5 max-w-3xl leading-relaxed text-muted-foreground">
            {organization.description}
          </p>
        )}
      </header>

      <Separator />

      <section className="space-y-4">
        {signedIn ? (
          <ReviewSummaryCard organizationId={organizationId} />
        ) : resolvingSession ? (
          <Skeleton className="h-40" />
        ) : (
          <SignInPrompt organizationId={organizationId}>
            Sign in to generate an AI summary of this organization&rsquo;s reviews.
          </SignInPrompt>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Services</h2>
            <p className="text-sm text-muted-foreground">
              What this organization offers.
            </p>
          </div>
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditForm(organizationId)}
              >
                <PencilIcon />
                Edit profile
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/organizations/${organizationId}/analytics`}>
                  <BarChartIcon />
                  Analytics
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingService(undefined);
                  setServiceFormOpen(true);
                }}
              >
                <PlusIcon />
                Add service
              </Button>
            </div>
          )}
        </div>

        <ServiceList
          organizationId={organizationId}
          canManage={isOwner}
          onDelete={(id) => deleteService.mutate(id)}
          onEdit={(service) => {
            setEditingService(service);
            setServiceFormOpen(true);
          }}
          deletingId={deleteService.isPending ? deleteService.variables : null}
        />

        {isOwner && (
          <ServiceForm
            organizationId={organizationId}
            open={isServiceFormOpen}
            onOpenChange={setServiceFormOpen}
            service={editingService}
          />
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Reviews</h2>
          <p className="text-sm text-muted-foreground">
            What customers say about working with them.
          </p>
        </div>

        <ReviewList organizationId={organizationId} />
        {signedIn ? (
          <ReviewForm organizationId={organizationId} />
        ) : resolvingSession ? (
          <Skeleton className="h-64" />
        ) : (
          <SignInPrompt organizationId={organizationId}>
            Sign in to share your experience with other customers.
          </SignInPrompt>
        )}
      </section>

      {/* Mounted here as well as on the list page: the store drives the dialog,
          so whichever page opens `openEditForm` must also host the form. */}
      {isOwner && <OrganizationForm />}

      {isOwner && (
        <>
          <Separator />
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Verification</h2>
              <p className="text-sm text-muted-foreground">
                A verified badge increases customer trust.
              </p>
            </div>
            <VerificationClaimForm
              organizationId={organizationId}
              verificationStatus={organization.verification_status}
            />
          </section>
        </>
      )}
    </div>
  );
}

/**
 * Shown in place of an account-only action when the viewer is signed out.
 *
 * The profile itself stays readable; only the writes (reviews, AI summary)
 * require a session, so the prompt points at `/login` and returns here.
 */
function SignInPrompt({
  organizationId,
  children,
}: {
  organizationId: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 py-6">
        <p className="text-sm text-muted-foreground">{children}</p>
        <Button asChild size="sm">
          <Link href={`/login?next=/organizations/${organizationId}`}>Sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
