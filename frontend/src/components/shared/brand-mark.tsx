import { ScanSearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site-config";

/**
 * Brand lockup.
 *
 * `wordmarkLight` renders the text in white for use on dark/primary-colour
 * backgrounds (e.g. the auth layout's Deep Blue panel).
 */
export function BrandMark({
  className,
  showWordmark = true,
  wordmarkLight = false,
}: {
  className?: string;
  showWordmark?: boolean;
  /** Renders wordmark text in white — use on dark or primary-colour panels. */
  wordmarkLight?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl text-white",
          wordmarkLight
            ? "bg-white/20 ring-2 ring-white/30 ring-offset-2 ring-offset-primary"
            : "bg-gradient-to-br from-primary to-accent shadow-md ring-2 ring-primary/25 ring-offset-2 ring-offset-background",
          "transition-transform hover:scale-105",
        )}
      >
        <ScanSearchIcon className="size-4.5" />
      </span>

      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "text-[15px] font-bold tracking-tight",
              wordmarkLight ? "text-white" : "text-foreground",
            )}
          >
            {siteConfig.shortName}
          </span>
          <span
            className={cn(
              "mt-1 hidden text-[11px] font-medium sm:block",
              wordmarkLight ? "text-white/60" : "text-muted-foreground",
            )}
          >
            {siteConfig.name}
          </span>
        </span>
      )}
    </span>
  );
}
