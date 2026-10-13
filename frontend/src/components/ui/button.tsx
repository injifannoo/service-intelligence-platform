import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2Icon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform]",
    "duration-150 ease-out select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-55",
    "active:translate-y-px",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Solid brand action with a soft ambient shadow that deepens on hover.
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:brightness-110 hover:shadow-md",
        outline:
          "border border-border bg-card text-foreground shadow-xs hover:border-primary/35 hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70 border border-transparent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 [&_svg]:size-4",
        sm: "h-8 rounded-md px-3 text-[13px] [&_svg]:size-3.5",
        lg: "h-11 rounded-lg px-6 text-[15px] [&_svg]:size-4",
        icon: "size-10 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Swaps the leading icon for a spinner and blocks repeat submits. */
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled === true || loading;

  if (asChild) {
    // `Slot` forwards a single child, so the spinner is only added when this is
    // a real <button>.
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2Icon className="animate-spin" aria-hidden="true" />}
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
