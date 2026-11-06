"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PlusIcon, StoreIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { AlertMessage } from "@/components/shared/alert-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/site-config";
import { useCurrentUser } from "@/features/authentication";
import { useOrganization } from "@/features/organizations";
import type { Service, ServiceFilters } from "@/types";

import { useDeleteService } from "../api/use-service";
import { ServiceCatalogue } from "./service-catalogue";
import { ServiceCatalogFilters } from "./service-catalog-filters";
import { ServiceForm } from "./service-form";
import { ServiceList } from "./service-list";

type StatusFilter = "all" | "active" | "inactive";

/**
 * Sprint 4 service workspace (docs/09_Sprint_Plan.md:284-306).
 *
 * Owners land on their own catalogue and can add, edit, or remove services.
 * Everyone else gets a read-only view across every organization. Keeping both
 * modes in one workspace means the page never has to guess whether the viewer
 * manages a tenant before the profile request settles.
 */
export function ServicesWorkspace() {
  const { data: user, isPending } = useCurrentUser();
  const organizationId = user?.organization_id ?? null;
  const { data: organization } = useOrganization(organizationId);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();

  const deleteService = useDeleteService(organizationId ?? undefined);

  const filters = useMemo<ServiceFilters>(
    () => ({
      organization_id: organizationId ?? undefined,
      category_id: categoryId || undefined,
      status: status === "all" ? undefined : status === "active",
      search: search.trim() || undefined,
    }),
    [organizationId, categoryId, status, search],
  );

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-24" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (!user) {
    return (
      <AlertMessage tone="error" title="Sign in required">
        Sign in to view and manage services.
      </AlertMessage>
    );
  }

  const isManager = Boolean(organizationId);

  return (
    <div className="space-y-8">
      <PageHeader
        title={isManager ? "Your services" : "Services"}
        description={
          isManager
            ? `Manage the catalogue customers see for ${organization?.name ?? "your organization"}.`
            : "Browse services published by organizations on the platform."
        }
        actions={
          isManager ? (
            <Button
              onClick={() => {
                setEditingService(undefined);
                setFormOpen(true);
              }}
            >
              <PlusIcon />
              Add service
            </Button>
          ) : user.role === "CUSTOMER" ? (
            <Button asChild variant="outline">
              <Link href={ROUTES.businessOnboarding}>
                <StoreIcon />
                List your services
              </Link>
            </Button>
          ) : undefined
        }
      />

      {!isManager && user.role === "CUSTOMER" && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Have a business to list?</p>
              <p className="text-sm text-muted-foreground">
                Register an organization to publish your own service catalogue.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href={ROUTES.businessOnboarding}>Get started</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isManager ? (
        <section className="space-y-4">
          <ServiceCatalogFilters
            search={search}
            categoryId={categoryId}
            status={status}
            showStatus
            onSearchChange={setSearch}
            onCategoryChange={setCategoryId}
            onStatusChange={setStatus}
          />

          <ServiceList
            filters={filters}
            canManage
            onDelete={(id) => deleteService.mutate(id)}
            onEdit={(service) => {
              setEditingService(service);
              setFormOpen(true);
            }}
            deletingId={deleteService.isPending ? deleteService.variables : null}
          />
        </section>
      ) : (
        <ServiceCatalogue />
      )}

      {organizationId && (
        <ServiceForm
          organizationId={organizationId}
          open={isFormOpen}
          onOpenChange={setFormOpen}
          service={editingService}
        />
      )}
    </div>
  );
}
