"use client";

import {
  BuildingIcon,
  ClipboardCheckIcon,
  MessageSquareWarningIcon,
  StarIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";

import { AlertMessage } from "@/components/shared/alert-message";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/site-config";
import { useAdminStats } from "@/features/admin/api/use-admin";

/**
 * Admin dashboard.
 *
 * Counts come from `GET /api/v1/admin/stats/`, which recomputes over the current
 * records. These are NOT the platform success metrics from docs/01:520-546:
 * MAU, search success rate, and recommendation acceptance need the Celery/Redis
 * event telemetry required by docs/01:548, which does not exist. Nothing here is
 * interpolated to fill that gap.
 */
export function AdminDashboard() {
  const { data, isPending, isError } = useAdminStats();

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Platform activity at a glance." />
        <AlertMessage tone="error" title="Dashboard unavailable">
          Platform statistics could not be loaded.
        </AlertMessage>
      </div>
    );
  }

  const roleBreakdown = Object.entries(data.users.by_role).filter(([, count]) => count);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Platform activity at a glance."
      />

      <section aria-labelledby="accounts-heading" className="space-y-3">
        <h2 id="accounts-heading" className="text-sm font-semibold text-muted-foreground">
          Accounts
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={UsersIcon} label="Total users" value={data.users.total} />
          <StatTile icon={UsersIcon} label="Active" value={data.users.active} />
          <StatTile
            icon={UsersIcon}
            label="Deactivated"
            value={data.users.deactivated}
            hint={data.users.deactivated > 0 ? "Cannot sign in" : undefined}
          />
          <StatTile
            icon={StarIcon}
            label="Administrators"
            value={(data.users.by_role.ADMIN ?? 0) + (data.users.by_role.SUPER_ADMIN ?? 0)}
            hint={`${data.users.by_role.SUPER_ADMIN ?? 0} super admin`}
          />
        </div>
      </section>

      <section aria-labelledby="content-heading" className="space-y-3">
        <h2 id="content-heading" className="text-sm font-semibold text-muted-foreground">
          Directory and content
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={BuildingIcon}
            label="Organizations"
            value={data.organizations.total}
            hint={`${data.organizations.verified} verified`}
          />
          <StatTile
            icon={ClipboardCheckIcon}
            label="Pending verification"
            value={data.verifications.pending}
            hint={data.verifications.pending > 0 ? "Awaiting review" : "Queue clear"}
            emphasis={data.verifications.pending > 0}
          />
          <StatTile
            icon={WrenchIcon}
            label="Services"
            value={data.services.total}
            hint={`${data.services.active} active`}
          />
          <StatTile
            icon={MessageSquareWarningIcon}
            label="Reported reviews"
            value={data.reviews.reported}
            hint={`of ${data.reviews.total} total`}
            emphasis={data.reviews.reported > 0}
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Accounts by role</CardTitle>
          <CardDescription>
            Public registration can only create Customer accounts. Admin and Super Admin
            accounts are provisioned in the background.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roleBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts yet.</p>
          ) : (
            <ul className="space-y-2">
              {roleBreakdown.map(([role, count]) => (
                <li key={role} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{role.replaceAll("_", " ")}</span>
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queues</CardTitle>
          <CardDescription>Work waiting on an administrator.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <QueueLink
            href={ROUTES.adminVerification}
            label="Verification requests"
            count={data.verifications.pending}
          />
          <QueueLink
            href={ROUTES.adminOrganizations}
            label="Organizations"
            count={data.organizations.total}
          />
          <QueueLink href={ROUTES.adminAuditLogs} label="Audit log" />
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  emphasis,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: number;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span
          className={
            emphasis
              ? "rounded-md bg-destructive/10 p-2 text-destructive"
              : "rounded-md bg-primary/10 p-2 text-primary"
          }
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}

function QueueLink({ href, label, count }: { href: string; label: string; count?: number }) {
  return (
    <ButtonLink href={href}>
      {label}
      {count !== undefined && (
        <Badge variant={count > 0 ? "accent" : "default"} className="ml-1">
          {count}
        </Badge>
      )}
    </ButtonLink>
  );
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
    >
      {children}
    </Link>
  );
}
