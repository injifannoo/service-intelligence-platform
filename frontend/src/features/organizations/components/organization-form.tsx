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
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PHASE_ONE_INDUSTRIES } from "@/config/site-config";

import {
  useCreateOrganization,
  useOrganization,
  useUpdateOrganization,
} from "../api/use-organization";
import { useOrganizationUiStore } from "../store/organization-store";

/**
 * Form body.
 *
 * Kept as its own component so Radix unmounting `DialogContent` on close
 * discards the local state. That avoids a reset-on-open effect, which React 19
 * flags as a cascading-render risk.
 *
 * In edit mode the record is fetched first and used as the initial state. Seeding
 * from the server rather than resetting with an effect matters: an edit form
 * that started blank would silently blank every field the operator did not
 * retype.
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

  const isEditing = editingId !== null;
  const existing = useOrganization(editingId);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<string>(PHASE_ONE_INDUSTRIES[0]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const isPending = createOrganization.isPending || updateOrganization.isPending;

  // The record arrives after the fields mount, so the initial state is filled
  // once on arrival rather than on every render.
  const [seededFrom, setSeededFrom] = useState<string | null>(null);
  if (isEditing && existing.data && seededFrom !== existing.data.id) {
    setSeededFrom(existing.data.id);
    setName(existing.data.name);
    setDescription(existing.data.description ?? "");
    setLocation(existing.data.location ?? "");
    setPhone(existing.data.phone ?? "");
    setWebsite(existing.data.website ?? "");
    if (existing.data.industry?.name) {
      setIndustry(existing.data.industry.name);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const payload = {
      name,
      industry,
      description: description || undefined,
      location: location || undefined,
      phone: phone || undefined,
      website: website || undefined,
    };

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

  if (isEditing && existing.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

      <Field id="org-name" label="Organization name" errors={fieldErrors.name}>
        <Input
          id="org-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder="Acme Technologies"
        />
      </Field>

      <Field id="org-industry" label="Industry" errors={fieldErrors.industry}>
        <Select
          id="org-industry"
          value={industry}
          onChange={(event) => setIndustry(event.target.value)}
        >
          {PHASE_ONE_INDUSTRIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="org-description" label="Description" errors={fieldErrors.description}>
        <Textarea
          id="org-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="What the business does, and who it serves."
        />
      </Field>

      <Field id="org-location" label="Location" errors={fieldErrors.location}>
        <Input
          id="org-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Addis Ababa"
        />
      </Field>

      <Field id="org-phone" label="Phone" errors={fieldErrors.phone}>
        <Input
          id="org-phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+251 ..."
        />
      </Field>

      <Field id="org-website" label="Website" errors={fieldErrors.website}>
        <Input
          id="org-website"
          type="url"
          inputMode="url"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          placeholder="https://example.com"
        />
      </Field>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          {isEditing ? "Save changes" : "Create organization"}
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

        {/* Mounted only while open so the body remounts and re-seeds on each open. */}
        {isOpen && (
          <OrganizationFormFields editingId={editingId} onDone={closeForm} />
        )}
      </DialogContent>
    </Dialog>
  );
}