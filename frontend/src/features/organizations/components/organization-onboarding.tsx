"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheckIcon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PHASE_ONE_INDUSTRIES } from "@/config/site-config";
import { useCurrentUser } from "@/features/authentication";
import { ApiError } from "@/lib/api-client";

import { useCreateOrganization } from "../api/use-organization";

/**
 * Business profile, step 2 of the guided onboarding (docs/09:256-278).
 *
 * Kept a full page rather than the `OrganizationForm` dialog: a business that
 * just signed up has one job here, and hiding it behind a modal on the directory
 * is what the two-step flow replaces. The industry is required and limited to the
 * Phase 1 taxonomy (docs/08:314-326). On success the owner lands on their public
 * profile, which carries the pending-verification badge and the claim form.
 */
export function OrganizationOnboarding() {
  const router = useRouter();
  const createOrganization = useCreateOrganization();
  const { data: user } = useCurrentUser();

  const existingOrganizationId = user?.organization_id ?? null;

  useEffect(() => {
    // One verified organization per legal business (enforced server-side too). A
    // visitor who already manages one cannot start a second.
    if (existingOrganizationId) {
      router.replace(`/organizations/${existingOrganizationId}`);
    }
  }, [existingOrganizationId, router]);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<string>(PHASE_ONE_INDUSTRIES[0]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    try {
      const organization = await createOrganization.mutateAsync({
        name,
        industry,
        description: description || undefined,
        location: location || undefined,
        phone: phone || undefined,
        website: website || undefined,
      });
      router.push(`/organizations/${organization.id}`);
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
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5" noValidate>
      {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

      <Field id="onboarding-name" label="Business name" errors={fieldErrors.name}>
        <Input
          id="onboarding-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder="Acme Technologies"
        />
      </Field>

      <Field
        id="onboarding-industry"
        label="Industry"
        errors={fieldErrors.industry}
      >
        <Select
          id="onboarding-industry"
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

      <Field
        id="onboarding-description"
        label="Description"
        errors={fieldErrors.description}
      >
        <Textarea
          id="onboarding-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="What the business does, and who it serves."
        />
      </Field>

      <Field id="onboarding-location" label="Location" errors={fieldErrors.location}>
        <Input
          id="onboarding-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Addis Ababa"
        />
      </Field>

      <Field id="onboarding-phone" label="Phone" errors={fieldErrors.phone}>
        <Input
          id="onboarding-phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+251 ..."
        />
      </Field>

      <Field id="onboarding-website" label="Website" errors={fieldErrors.website}>
        <Input
          id="onboarding-website"
          type="url"
          inputMode="url"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          placeholder="https://example.com"
        />
      </Field>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Your profile starts as pending. You can submit a verification document
        from your profile straight after this step.
      </p>

      <Button type="submit" className="w-full" size="lg" loading={createOrganization.isPending}>
        Create business profile
      </Button>
    </form>
  );
}
