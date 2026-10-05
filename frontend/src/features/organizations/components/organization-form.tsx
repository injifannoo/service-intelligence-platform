"use client";

import { useState, type FormEvent } from "react";

import { ApiError } from "@/lib/api-client";
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
import { PHASE_ONE_INDUSTRIES } from "@/config/site-config";

import {
  useCreateOrganization,
  useUpdateOrganization,
} from "../api/use-organization";
import { useOrganizationUiStore } from "../store/organization-store";

/**
 * Form body.
 *
 * Kept as its own component so Radix unmounting `DialogContent` on close
 * discards the local state. That avoids a reset-on-open effect, which React 19
 * flags as a cascading-render risk.
 */
function OrganizationFormFields({
  editingId,
  onDone,
}: {
  editingId: string | null;
  onDone: () => void;
}) {
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<string>(PHASE_ONE_INDUSTRIES[0]);
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const isEditing = editingId !== null;
  const isPending = createOrganization.isPending || updateOrganization.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const payload = { name, industry, description: description || undefined };

    try {
      if (editingId) {
        await updateOrganization.mutateAsync({ id: editingId, payload });
      } else {
        await createOrganization.mutateAsync(payload);
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
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

      <div className="space-y-2">
        <label htmlFor="org-name" className="text-sm font-medium">
          Organization name
        </label>
        <Input
          id="org-name"
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
        <label htmlFor="org-industry" className="text-sm font-medium">
          Industry
        </label>
        <select
          id="org-industry"
          value={industry}
          onChange={(event) => setIndustry(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {PHASE_ONE_INDUSTRIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="org-description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="org-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving…"
            : isEditing
              ? "Save changes"
              : "Create organization"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function OrganizationForm() {
  const isOpen = useOrganizationUiStore((state) => state.isFormOpen);
  const editingId = useOrganizationUiStore((state) => state.editingId);
  const closeForm = useOrganizationUiStore((state) => state.closeForm);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeForm()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Edit organization" : "Register organization"}
          </DialogTitle>
          <DialogDescription>
            One verified organization is allowed per legal business.
          </DialogDescription>
        </DialogHeader>

        <OrganizationFormFields editingId={editingId} onDone={closeForm} />
      </DialogContent>
    </Dialog>
  );
}
