"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2Icon, ShieldCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AlertMessage } from "@/components/shared/alert-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { VERIFICATION_DOCUMENT_TYPES, VERIFICATION_STATUS_LABELS } from "@/types";

import { useSubmitVerificationClaim } from "../api/use-verification";

/**
 * Verification claim submission, docs/05_API_Design.md:344-356.
 *
 * docs/04:379-393 makes Verification 1:1 with Organization, so a verified
 * organization is locked out of submitting again; the route enforces that with
 * 409 and the button is hidden to match.
 */
export function VerificationClaimForm({
  organizationId,
  verificationStatus,
}: {
  organizationId: string;
  verificationStatus: string;
}) {
  const submitClaim = useSubmitVerificationClaim(organizationId);

  const [documentType, setDocumentType] = useState(VERIFICATION_DOCUMENT_TYPES[0]);
  const [documentUrl, setDocumentUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  const isVerified = verificationStatus === "VERIFIED";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    try {
      await submitClaim.mutateAsync({
        document_type: documentType,
        document_url: documentUrl.trim(),
      });
      setDocumentUrl("");
      setSubmitted(true);
    } catch (error) {
      setSubmitted(false);
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  }

  if (isVerified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheckIcon className="size-5 text-emerald-600" />
            Verified organization
          </CardTitle>
          <CardDescription>
            Your verification is approved. Customers see a verified badge on your
            profile.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Get verified</CardTitle>
        <CardDescription>
          Submit a business document. An administrator reviews it, and a verified
          badge increases customer trust.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

          {submitted && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              <CheckCircle2Icon className="size-4 shrink-0" />
              Claim submitted. An administrator will review it shortly.
            </p>
          )}

          {verificationStatus === "REJECTED" && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">Your previous claim was not approved.</p>
              <p className="mt-1">
                Submit a different or clearer document to request another review.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="document-type">Document type</Label>
            <Select
              id="document-type"
              value={documentType}
              onChange={(event) =>
                setDocumentType(event.target.value as typeof documentType)
              }
            >
              {VERIFICATION_DOCUMENT_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            {fieldErrors.document_type?.map((message) => (
              <p key={message} className="text-xs text-destructive">
                {message}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-url">Document link</Label>
            <Input
              id="document-url"
              type="url"
              value={documentUrl}
              onChange={(event) => setDocumentUrl(event.target.value)}
              placeholder="https://example.com/registration.pdf"
              aria-invalid={Boolean(fieldErrors.document_url)}
            />
            {fieldErrors.document_url?.map((message) => (
              <p key={message} className="text-xs text-destructive">
                {message}
              </p>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitClaim.isPending}>
              {submitClaim.isPending ? "Submitting…" : "Submit for review"}
            </Button>
            {verificationStatus === "PENDING" && (
              <Badge variant="warning">{VERIFICATION_STATUS_LABELS.PENDING}</Badge>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
