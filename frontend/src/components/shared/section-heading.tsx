import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Optional trailing control, e.g. a "View all" link. */
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

/**
 * Standard section header shared by the marketing homepage.
 *
 * Extracted so every band uses the same eyebrow/heading/body rhythm and the
 * title, description and action line up on one baseline. Kept in `shared/`
 * rather than the homepage folder so the dashboard and admin surfaces can adopt
 * the identical hierarchy.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        centered && "sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl space-y-3", centered && "mx-auto text-center")}>
        {eyebrow && (
          <p className="text-xs font-bold tracking-wider text-primary uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        {description && (
          <p className="text-lg leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div className={cn("shrink-0", centered && "mx-auto")}>{action}</div>
      )}
    </div>
  );
}
