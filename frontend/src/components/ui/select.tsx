import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { controlClasses } from "./input";

/**
 * A styled native `<select>`.
 *
 * Deliberately not a Radix listbox: the platform needs a handful of single
 * choice fields and a native control is keyboard- and screen-reader-correct
 * with no extra dependency. Swap for a Radix `Select` only if a combobox with
 * async search is ever needed.
 */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          controlClasses,
          "h-10 cursor-pointer appearance-none py-2 pr-9 pl-3",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { Select };
