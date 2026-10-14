import { ScanSearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site-config";

/**
 * Brand lockup with refined visual identity.
 *
 * The mark features a sophisticated gradient on an AI/search icon that
 * represents intelligent search. Designed to be scalable, crisp, and
 * professional across all contexts.
 */
export function BrandMark({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl text-white",
          "bg-gradient-to-br from-primary to-accent shadow-md",
          "ring-2 ring-primary/25 ring-offset-2 ring-offset-background transition-transform hover:scale-105",
        )}
      >
        <ScanSearchIcon className="size-4.5" />
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight">
            {siteConfig.shortName}
          </span>
          <span className="mt-1 hidden text-[11px] font-medium text-muted-foreground sm:block">
            {siteConfig.name}
          </span>
        </span>
      )}
    </span>
  );
}
