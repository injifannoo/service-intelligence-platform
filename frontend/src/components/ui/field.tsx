"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { Label } from "./label";

/**
 * Labelled form control with inline validation messages.
 *
 * A single child is expected. Its `aria-invalid` and `aria-describedby` are
 * injected here so the error text is announced with the input rather than being
 * read as a separate region — the previous per-form inline markup repeated that
 * markup in eight places and wired it inconsistently.
 */
export function Field({
  id,
  label,
  errors,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  errors?: readonly string[];
  hint?: string;
  className?: string;
  children: React.ReactElement<React.ComponentProps<"input">>;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const messages = errors ?? [];
  const hasError = messages.length > 0;

  const describedBy =
    [hasError ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  // `children` is a single control element; cloning keeps the markup declarative
  // without forcing every caller to hand-wire ARIA attributes.
  const control =
    hasError || hint
      ? React.cloneElement(children, {
          "aria-describedby": describedBy,
          "aria-invalid": hasError || undefined,
        })
      : children;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {hint && !hasError && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {hasError && (
        <div id={errorId} role="alert" className="space-y-1">
          {messages.map((message) => (
            <p key={message} className="text-xs font-medium text-destructive">
              {message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
