import { cn } from "@/lib/utils";

/**
 * Empty state.
 *
 * A dashed container alone reads as "unfinished"; the soft tinted surface plus
 * a framed icon makes an intentional empty state look designed.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="grid size-11 place-items-center rounded-xl bg-card text-muted-foreground shadow-xs ring-1 ring-border">
          <Icon className="size-5" />
        </span>
      )}
      <div className="max-w-sm space-y-1.5">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
