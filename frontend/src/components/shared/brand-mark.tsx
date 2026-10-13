import { ScanSearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site-config";

/**
 * Brand lockup.
 *
 * The mark is an inline AI/search icon on a CSS gradient rather than an asset so
 * it inherits `currentColor`, stays crisp at any size, and keeps the repo free
 * of a binary logo file. `ScanSearch` reads as "intelligent search", which is
 * what the brand promises.
 */
export function BrandMark({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-[10px] text-primary-foreground",
          "bg-gradient-to-br from-primary to-primary/70 shadow-sm",
          "ring-1 ring-primary/20 ring-inset",
        )}
      >
        <ScanSearchIcon className="size-4" />
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">
            {siteConfig.shortName}
          </span>
          <span className="mt-0.5 hidden text-[11px] font-medium text-muted-foreground sm:block">
            {siteConfig.name}
          </span>
        </span>
      )}
    </span>
  );
}
