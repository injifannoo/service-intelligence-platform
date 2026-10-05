import { cn } from "@/lib/utils";

/**
 * Loading placeholder. Pass `className` to set the shape; the base gradient
 * animates from a soft neutral to a slightly lighter one so a skeleton reads as
 * loading rather than as an empty box.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
