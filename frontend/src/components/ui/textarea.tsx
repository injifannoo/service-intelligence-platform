import * as React from "react";

import { cn } from "@/lib/utils";

import { controlClasses } from "./input";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(controlClasses, "min-h-24 resize-y px-3 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export { Textarea };
