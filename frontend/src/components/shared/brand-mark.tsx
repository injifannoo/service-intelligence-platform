import Image from "next/image";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site-config";

/**
 * Brand lockup.
 *
 * The mark is the real `logo.png` from `public/assets`, so every place that
 * renders the brand — header, footer, homepage nav, auth layout, admin sidebar —
 * shows the same artwork. `wordmarkLight` renders the text in white for use on
 * dark/primary-colour backgrounds (e.g. the auth layout's Deep Blue panel).
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
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1",
          wordmarkLight
            ? "ring-white/30"
            : "ring-primary/15 shadow-sm",
          "transition-transform hover:scale-105",
        )}
      >
        <Image
          src="/assets/logo.png"
          alt=""
          width={36}
          height={36}
          className="size-9 object-contain"
          priority
        />
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
