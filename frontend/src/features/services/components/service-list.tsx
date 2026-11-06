"use client";

import { Loader2Icon, PackageOpenIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Service, ServiceFilters } from "@/types";

import { useServices } from "../api/use-service";
import { ServiceCard } from "./service-card";

interface ServiceListProps {
  /** List filters; include `organization_id` to scope the catalogue. */
  filters?: ServiceFilters;
  canManage?: boolean;
  /** Show the parent organization on each card in a flat catalogue. */
  showOrganization?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (service: Service) => void;
  deletingId?: string | null;
}

export function ServiceList({
  filters = {},
  canManage = false,
  showOrganization = false,
  onDelete,
  onEdit,
  deletingId = null,
}: ServiceListProps) {
  const { data, isPending, isError, error, refetch } = useServices(filters);

  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load services."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const services = data?.data ?? [];
  const isFiltered =
    Boolean(filters.search) ||
    Boolean(filters.category_id) ||
    filters.status !== undefined;

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
        <PackageOpenIcon className="size-7 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isFiltered ? "No services match these filters" : "No services listed yet"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isFiltered
            ? "Try a different search term or category."
            : canManage
              ? "Add a service so customers can discover what you offer."
              : "This organization has not listed any services."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          canManage={canManage}
          showOrganization={showOrganization}
          onDelete={onDelete}
          onEdit={onEdit}
          isDeleting={deletingId === service.id}
        />
      ))}
    </div>
  );
}

/** Compact inline loader used while a mutation is in flight. */
export function InlineSpinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2Icon className="size-4 animate-spin" />
      {label}
    </span>
  );
}
