"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { AlertMessage } from "@/components/shared/alert-message";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api-client";
import type { Service } from "@/types";

interface ServiceCardProps {
  service: Service;
  /** When present, the viewer manages the parent organization and may edit. */
  canManage?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (service: Service) => void;
  isDeleting?: boolean;
}

export function ServiceCard({
  service,
  canManage = false,
  onDelete,
  onEdit,
  isDeleting = false,
}: ServiceCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 p-4 pb-2">
        <CardTitle className="text-base">{service.name}</CardTitle>
        {service.price !== undefined && service.price !== null && (
          <Badge variant="accent" className="shrink-0 tabular-nums">
            {service.price}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        {service.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/70 italic">
            No description provided.
          </p>
        )}
        {canManage && onDelete && (
          <div className="flex gap-2 border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit?.(service)}
              disabled={onEdit === undefined}
            >
              <PencilIcon />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/8 hover:text-destructive"
              onClick={() => onDelete(service.id)}
              loading={isDeleting}
            >
              {/* The button shows its own spinner while deleting. */}
              {!isDeleting && <Trash2Icon />}
              {isDeleting ? "Removing" : "Remove"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Renders a mutation error the same way across slices. */
export function MutationError({ error }: { error: unknown }) {
  if (!error) return null;
  const message =
    error instanceof ApiError ? error.message : "Something went wrong. Please try again.";

  return <AlertMessage tone="error">{message}</AlertMessage>;
}
