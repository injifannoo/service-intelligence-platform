import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A styled native checkbox.
 *
 * Native rather than Radix for the same reason as `select.tsx`: these are plain
 * boolean choices, and a native control is keyboard- and screen-reader-correct
 * with no extra dependency.
 */
function Checkbox({
  className,
  type = "checkbox",
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { type?: "checkbox" }) {
  return (
    <input
      type={type}
      data-slot="checkbox"
      className={cn(
        "size-4 shrink-0 cursor-pointer rounded border border-input accent-primary",
        "transition-shadow duration-150",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
