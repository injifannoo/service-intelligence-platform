"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, UserRoundIcon } from "lucide-react";

import { ApiError, apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/shared/alert-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { USER_ROLE_LABELS, type UserProfile } from "@/types";

import { useCurrentUser } from "../api/use-auth";

/**
 * Editable form.
 *
 * Split out and keyed on the user id so its local state is seeded from the
 * loaded profile exactly once. Deriving state inside an effect instead would
 * cascade an extra render, which React 19 flags.
 */
function ProfileForm({ user }: { user: UserProfile }) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);

  const updateProfile = useMutation({
    mutationFn: (payload: { name: string; email: string }) =>
      apiClient.put<UserProfile>("/users/profile/", payload),
    // The header and every role-gated surface read the auth cache, so it has to
    // be refetched rather than patched locally.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth"] });
      setFormError(null);
      setFieldErrors({});
      setSaved(true);
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSaved(false);

    try {
      await updateProfile.mutateAsync({ name, email });
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
    <form onSubmit={handleSubmit} className="max-w-md space-y-4" noValidate>
      {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

      {saved && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <CheckCircle2Icon className="size-4 shrink-0" />
          Profile updated.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="profile-name">Full name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name?.map((message) => (
          <p key={message} className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
        />
        {fieldErrors.email?.map((message) => (
          <p key={message} className="text-xs text-destructive">
            {message}
          </p>
        ))}
      </div>

      <Button type="submit" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

/**
 * Profile view, docs/05_API_Design.md:250-268.
 *
 * The read comes from the `useCurrentUser` cache; only the write hits the
 * network.
 */
export function ProfilePanel() {
  const { data: user, isPending, isError, error } = useCurrentUser();

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  }

  if (isError || !user) {
    return (
      <AlertMessage tone="error">
        {error instanceof Error ? error.message : "Failed to load your profile."}
      </AlertMessage>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted">
          <UserRoundIcon className="size-5 text-muted-foreground" />
        </span>
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">
            {USER_ROLE_LABELS[user.role]}
          </p>
        </div>
      </div>

      <Separator />

      <ProfileForm key={user.id} user={user} />

      {user.organization_id && (
        <>
          <Separator />
          <p className="text-sm text-muted-foreground">
            You manage the organization shown on your{" "}
            <a
              href={`/organizations/${user.organization_id}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              public profile
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
