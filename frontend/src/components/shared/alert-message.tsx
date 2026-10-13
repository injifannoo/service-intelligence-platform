import { AlertCircleIcon, CheckCircle2Icon, InfoIcon, TriangleAlertIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "warning" | "info";

const TONES: Record<
  Tone,
  { wrapper: string; icon: string; Icon: typeof AlertCircleIcon; role: "alert" | "status" }
> = {
  error: {
    wrapper: "border-destructive/30 bg-destructive/8 text-destructive",
    icon: "text-destructive",
    Icon: AlertCircleIcon,
    role: "alert",
  },
  success: {
    wrapper: "border-success/30 bg-success/8 text-success",
    icon: "text-success",
    Icon: CheckCircle2Icon,
    role: "status",
  },
  warning: {
    wrapper: "border-warning/40 bg-warning/12 text-warning-foreground",
    icon: "text-warning",
    Icon: TriangleAlertIcon,
    role: "alert",
  },
  info: {
    wrapper: "border-primary/25 bg-accent text-accent-foreground",
    icon: "text-primary",
    Icon: InfoIcon,
    role: "status",
  },
};

/**
 * Inline feedback banner.
 *
 * Extracted because the same role-alert markup was duplicated across eight
 * feature forms; keeping the role and tone mapping here means a new form gets
 * accessible, consistent feedback by default.
 */
export function AlertMessage({
  tone = "error",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const config = TONES[tone];
  const { Icon } = config;

  return (
    <div
      role={config.role}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        config.wrapper,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", config.icon)} aria-hidden="true" />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        <div className="leading-relaxed break-words">{children}</div>
      </div>
    </div>
  );
}
