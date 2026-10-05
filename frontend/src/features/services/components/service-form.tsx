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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";

import { useCreateService } from "../api/use-service";

/**
 * Kept separate from the dialog shell so Radix unmounting `DialogContent` on
 * close discards the local state — the same reasoning as OrganizationForm, and
 * it avoids a reset-on-open effect that React 19 flags as a render risk.
 */
function ServiceFormFields({
  organizationId,
  onDone,
}: {
  organizationId: string;
  onDone: () => void;
}) {
  const createService = useCreateService(organizationId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
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

    try {
      await createService.mutateAsync({
        name,
        description: description || undefined,
        price: parsedPrice,
      });
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
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

      <div className="space-y-2">
        <Label htmlFor="service-name">Service name</Label>
        <Input
          id="service-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name?.map((message) => (
          <p key={message} className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="service-description">Description</Label>
        <Textarea
          id="service-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
        />
        {fieldErrors.description?.map((message) => (
          <p key={message} className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="service-price">Price</Label>
        <Input
          id="service-price"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="Optional"
          aria-invalid={Boolean(fieldErrors.price)}
        />
        {fieldErrors.price?.map((message) => (
          <p key={message} className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={createService.isPending}>
          {createService.isPending ? "Adding…" : "Add service"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ServiceForm({
  organizationId,
  open,
  onOpenChange,
}: {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a service</DialogTitle>
          <DialogDescription>
            List a service customers can discover and compare.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <ServiceFormFields
            organizationId={organizationId}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
