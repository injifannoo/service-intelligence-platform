"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

export function AuthBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Go back to previous page"
    >
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      Back
    </button>
  );
}
