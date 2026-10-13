import * as React from "react";

import { cn } from "@/lib/utils";

const controlClasses = [
  "w-full rounded-lg border border-input bg-card text-sm text-foreground shadow-xs",
  "transition-[border-color,box-shadow,background-color] duration-150",
  "placeholder:text-muted-foreground/70",
  "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-ring/12",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
  "aria-invalid:border-destructive/70 aria-invalid:ring-destructive/15",
].join(" ");

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        controlClasses,
        "h-10 px-3 py-2",
        "file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input, controlClasses };
