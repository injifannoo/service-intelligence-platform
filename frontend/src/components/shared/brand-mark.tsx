import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site-config";

/**
 * Brand lockup.
 *
 * The mark is CSS rather than an asset so it inherits `currentColor` and stays
 * crisp in any size, and so the repo needs no binary logo file.
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
          "grid size-8 shrink-0 place-items-center rounded-[10px] text-sm font-bold text-primary-foreground",
          "bg-gradient-to-br from-primary to-primary/70 shadow-sm",
          "ring-1 ring-primary/20 ring-inset",
        )}
      >
        A
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">
            {siteConfig.shortName}
          </span>
          <span className="mt-0.5 hidden text-[11px] font-medium text-muted-foreground sm:block">
            System Intelligence
          </span>
        </span>
      )}
    </span>
  );
}
