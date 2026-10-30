import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2Icon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl",
    "text-sm font-semibold tracking-tight transition-all",
    "duration-200 ease-out select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200",
  ].join(" "),
  {
    variants: {
      variant: {
        // Rich primary button with gradient background and enhanced shadow
        default:
          "bg-primary text-primary-foreground shadow-md hover:bg-primary-hover hover:shadow-lg hover:[&_svg]:translate-x-0.5",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:brightness-110 hover:shadow-lg",
        outline:
          "border-2 border-border bg-card text-foreground shadow-sm hover:border-primary/40 hover:bg-accent hover:text-accent-foreground hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 border border-border/60",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
      },
      size: {
        default: "h-11 px-5 [&_svg]:size-4",
        sm: "h-9 rounded-lg px-4 text-[13px] [&_svg]:size-3.5",
        lg: "h-12 rounded-xl px-7 text-[15px] [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-4.5",
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
