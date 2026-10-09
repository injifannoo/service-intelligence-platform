"use client";

import { useState } from "react";
import { RotateCcwIcon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/authentication";
import { ApiError } from "@/lib/api-client";
import { HOMEPAGE_SECTIONS } from "@/types";
import type { HomepageSectionKey } from "@/types";

import {
  useHomepageSettings,
  useUpdateHomepageSettings,
} from "../api/use-admin";

const DEFAULT_SECTIONS = Object.fromEntries(
  HOMEPAGE_SECTIONS.map((key) => [key, true]),
) as Record<HomepageSectionKey, boolean>;

const SECTION_META: Record<HomepageSectionKey, { label: string; description: string }> = {
  hero: {
    label: "Hero",
    description: "Headline, search, and hero photo at the top of the homepage.",
  },
  metrics: {
    label: "Live metrics",
    description: "Directory counters under the hero.",
  },
  categories: {
    label: "Explore categories",
    description: "The service category cards.",
  },
  howItWorks: {
    label: "How it works",
    description: "The discover, compare, and choose explainer.",
  },
  featuredProviders: {
    label: "Featured providers",
    description: "Real organizations drawn from the directory.",
  },
  forBusinesses: {
    label: "For Businesses",
    description: "Benefits panel recruiting businesses to claim their profile.",
  },
  whyChoose: {
    label: "Why choose ASIP",
    description: "The three trust-benefit cards.",
  },
  finalCta: {
    label: "Final call-to-action",
    description: "The closing sign-up banner before the footer.",
  },
};

function sameSections(a: Record<HomepageSectionKey, boolean>, b: Record<HomepageSectionKey, boolean>) {
  return HOMEPAGE_SECTIONS.every((key) => a[key] === b[key]);
}

/**
 * Super Admin control over which homepage sections are rendered.
 *
 * Writes go through `PUT /api/v1/settings/homepage/`, which is the only
 * homepage configuration surface the dev backend has. The public homepage reads
 * the same endpoint, so a change here applies on the next page load.
 */
export function AdminHomepageSettings() {
  const { data: user } = useCurrentUser();
  const enabled = user?.role === "SUPER_ADMIN";

  const settingsQuery = useHomepageSettings(enabled);
  const update = useUpdateHomepageSettings();

  /**
   * A null draft means "unchanged", so the checkboxes always reflect the last
   * saved settings until the Super Admin starts editing. Saving clears the
   * draft back to null and the refetched settings become the new baseline.
   */
  const [draft, setDraft] = useState<Record<HomepageSectionKey, boolean> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const settings = settingsQuery.data;
  const active = draft ?? settings?.sections ?? DEFAULT_SECTIONS;

  if (!enabled) return null;

  if (settingsQuery.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <AlertMessage tone="error">
        {settingsQuery.error instanceof Error
          ? settingsQuery.error.message
          : "Failed to load homepage settings."}
      </AlertMessage>
    );
  }

  const dirty =
    draft !== null && settings !== undefined && !sameSections(draft, settings.sections);

  function handleToggle(key: HomepageSectionKey, checked: boolean) {
    setError(null);
    setSaved(false);
    setDraft((previous) => {
      const base = previous ?? settings?.sections ?? DEFAULT_SECTIONS;
      return { ...base, [key]: checked };
    });
  }

  async function handleSave() {
    if (!draft) return;
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ sections: draft });
      setDraft(null);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save homepage settings.");
    }
  }

  function handleRestoreDefaults() {
    setError(null);
    setSaved(false);
    setDraft({ ...DEFAULT_SECTIONS });
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">Homepage sections</h2>
        <p className="text-sm text-muted-foreground">
          Visible sections are rendered on the public homepage. Turn one off to
          hide it while keeping the section in the codebase.
        </p>
      </div>

      {error && <AlertMessage tone="error">{error}</AlertMessage>}
      {saved && !update.isPending && (
        <AlertMessage tone="success">Homepage settings saved.</AlertMessage>
      )}

      <ul className="divide-y divide-border rounded-lg border border-border">
        {HOMEPAGE_SECTIONS.map((key) => {
          const meta = SECTION_META[key];
          const checked = active[key];
          return (
            <li key={key} className="flex items-start gap-3 p-4">
              <Checkbox
                id={`homepage-${key}`}
                checked={checked}
                disabled={update.isPending}
                onChange={(event) => {
                  handleToggle(key, event.currentTarget.checked);
                }}
              />
              <div className="min-w-0">
                <Label htmlFor={`homepage-${key}`} className="text-sm font-medium">
                  {meta.label}
                </Label>
                <p className="text-sm text-muted-foreground">{meta.description}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} disabled={!dirty || update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          variant="outline"
          onClick={handleRestoreDefaults}
          disabled={update.isPending}
        >
          <RotateCcwIcon aria-hidden="true" />
          Restore defaults
        </Button>
      </div>
    </section>
  );
}