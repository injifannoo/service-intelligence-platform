"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/shared/alert-message";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import type { Service } from "@/types";

import { useCreateService, useUpdateService } from "../api/use-service";

/**
 * Kept separate from the dialog shell so Radix unmounting `DialogContent` on
 * close discards the local state — the same reasoning as OrganizationForm, and
 * it avoids a reset-on-open effect that React 19 flags as a render risk.
 *
 * When `service` is supplied the form switches to update mode and seeds its
 * fields from the record, which is what makes "Edit service" (Sprint 4,
 * docs/09_Sprint_Plan.md:291-308) a single component rather than two.
 */
function ServiceFormFields({
  organizationId,
  service,
  onDone,
}: {
  organizationId: string;
  service?: Service;
  onDone: () => void;
}) {
  const createService = useCreateService(organizationId);
  const updateService = useUpdateService(organizationId);

  const isEditing = service !== undefined;
  const mutation = isEditing ? updateService : createService;

  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [price, setPrice] = useState(
    service?.price !== null && service?.price !== undefined ? String(service.price) : "",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsedPrice = price.trim() === "" ? undefined : Number(price);
    if (parsedPrice !== undefined && Number.isNaN(parsedPrice)) {
      setFieldErrors({ price: ["Enter a number."] });
      return;
    }

    const payload = {
      name,
      description: description || undefined,
      price: parsedPrice,
    };

    try {
      if (isEditing) {
        await updateService.mutateAsync({ id: service.id, payload });
      } else {
        await createService.mutateAsync(payload);
      }
      onDone();
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
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

      <Field id="service-name" label="Service name" errors={fieldErrors.name}>
        <Input
          id="service-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder="Cloud migration"
        />
      </Field>

      <Field id="service-description" label="Description" errors={fieldErrors.description}>
        <Textarea
          id="service-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="What the customer receives, and any constraints."
        />
      </Field>

      <Field
        id="service-price"
        label="Price"
        errors={fieldErrors.price}
        // docs/04 defines no currency column (src/types/index.ts contradiction 8),
        // so the field stays a bare number rather than inventing a symbol.
        hint="Optional. Leave blank if the service is not priced."
      >
        <Input
          id="service-price"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="Optional"
        />
      </Field>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEditing ? "Save changes" : "Add service"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ServiceForm({
  organizationId,
  open,
  onOpenChange,
  service,
}: {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Supplying a record switches the dialog into update mode. */
  service?: Service;
}) {
  const isEditing = service !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit service" : "Add a service"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update how this service is presented to customers."
              : "List a service customers can discover and compare."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <ServiceFormFields
            organizationId={organizationId}
            service={service}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}