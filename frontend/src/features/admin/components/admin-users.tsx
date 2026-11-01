"use client";

import { useState } from "react";
import { ShieldCheckIcon, UserPlusIcon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
} from "@/features/admin/api/use-admin";
import { useCurrentUser } from "@/features/authentication";
import { ApiError } from "@/lib/api-client";
import { ASSIGNABLE_ADMIN_ROLES, USER_ROLE_LABELS } from "@/types";
import type { AdminUserFilters, AssignableAdminRole, UserRole } from "@/types";

/**
 * Users and roles — Super Admin only.
 *
 * The sidebar already hides this route from a regular Admin and the endpoints
 * refuse a non-Super-Admin independently. Both layers are deliberate: the
 * visible one is a convenience, only the enforced one is a control.
 *
 * Admin-tier accounts can only be created here. Public registration cannot
 * produce an admin role, so this form is the entire provisioning path.
 */
export function AdminUsers() {
  const [filters, setFilters] = useState<AdminUserFilters>({});
  const [queryDraft, setQueryDraft] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: currentUser } = useCurrentUser();

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  // Gated on the role rather than left enabled: a regular Admin can type this URL
  // even though the sidebar hides the link, and the endpoint would answer 403.
  // Not asking is both faster and a clearer signal than a permission error.
  const users = useAdminUsers(filters, isSuperAdmin);
  const updateUser = useUpdateAdminUser();
  const total = users.data?.pagination?.count ?? 0;

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setFilters((previous) => ({ ...previous, query: queryDraft.trim() || undefined }));
  }

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users & roles" description="Accounts, roles, and provisioning." />
        <AlertMessage tone="error" title="Super Admin access required">
          Account and role management is limited to Super Admins. Ask a Super Admin if you
          need an administrator created or a role changed.
        </AlertMessage>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & roles"
        description="Search accounts, change roles, and provision administrators."
        actions={
          <Button onClick={() => setShowCreate((open) => !open)} disabled={!isSuperAdmin}>
            <UserPlusIcon aria-hidden="true" />
            {showCreate ? "Close" : "New admin"}
          </Button>
        }
      />

      {showCreate && isSuperAdmin && <CreateAdminForm onDone={() => setShowCreate(false)} />}

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            {total} matching account{total === 1 ? "" : "s"}. Role and activation changes are
            written to the audit log.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-3">
            <Field id="admin-user-query" label="Search" className="min-w-56 flex-1">
              <Input
                id="admin-user-query"
                value={queryDraft}
                placeholder="Name or email"
                onChange={(event) => setQueryDraft(event.target.value)}
              />
            </Field>
            <Field id="admin-user-role" label="Role">
              <Select
                id="admin-user-role"
                value={filters.role ?? ""}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    role: (event.target.value || undefined) as UserRole | undefined,
                  }))
                }
              >
                <option value="">All roles</option>
                {(Object.keys(USER_ROLE_LABELS) as UserRole[]).map((role) => (
                  <option key={role} value={role}>
                    {USER_ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="admin-user-status" label="Status">
              <Select
                id="admin-user-status"
                value={filters.status === undefined ? "" : String(filters.status)}
                onChange={(event) => {
                  const raw = event.target.value;
                  setFilters((previous) => ({
                    ...previous,
                    status: raw === "" ? undefined : raw === "true",
                  }));
                }}
              >
                <option value="">Any</option>
                <option value="true">Active</option>
                <option value="false">Deactivated</option>
              </Select>
            </Field>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          {updateUser.isError && (
            <AlertMessage tone="error">
              {updateUser.error instanceof Error
                ? updateUser.error.message
                : "The account could not be updated."}
            </AlertMessage>
          )}

          {users.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : users.isError ? (
            <AlertMessage tone="error" title="Could not load accounts">
              {users.error instanceof Error ? users.error.message : "Please try again."}
            </AlertMessage>
          ) : users.data && users.data.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="py-2 pr-4 font-medium">User</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Role</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Joined</th>
                    <th scope="col" className="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data?.data.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const isSuperAdminTarget = user.role === "SUPER_ADMIN";
                    const canChangeRole = isSuperAdmin && !isSelf;
                    const canToggleStatus = !isSelf && (!isSuperAdminTarget || isSuperAdmin);

                    return (
                      <tr key={user.id} className="border-b border-border/60 last:border-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </td>
                        <td className="py-3 pr-4">
                          {canChangeRole ? (
                            <Select
                              aria-label={`Role for ${user.name}`}
                              value={user.role}
                              onChange={(event) =>
                                updateUser.mutate({
                                  id: user.id,
                                  role: event.target.value as AssignableAdminRole,
                                })
                              }
                            >
                              {ASSIGNABLE_ADMIN_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {USER_ROLE_LABELS[role]}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <Badge variant={isSuperAdminTarget ? "accent" : "default"}>
                              {isSelf && <ShieldCheckIcon className="size-3" aria-hidden="true" />}
                              {USER_ROLE_LABELS[user.role]}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={user.status ? "success" : "destructive"}>
                            {user.status ? "Active" : "Deactivated"}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant={user.status ? "outline" : "secondary"}
                            disabled={!canToggleStatus || updateUser.isPending}
                            onClick={() =>
                              updateUser.mutate({ id: user.id, status: !user.status })
                            }
                          >
                            {user.status ? "Deactivate" : "Reactivate"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateAdminForm({ onDone }: { onDone: () => void }) {
  const create = useCreateAdminUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AssignableAdminRole>("ADMIN");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    try {
      await create.mutateAsync({ name, email, password, role });
      onDone();
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        // A field-level failure is already shown under its input; repeating it as
        // a banner would report the same problem twice.
        if (Object.keys(error.fieldErrors).length === 0) setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New administrator</CardTitle>
        <CardDescription>
          Administrators cannot be self-registered. This account signs in immediately with
          the credentials you set.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <AlertMessage tone="error">{formError}</AlertMessage>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="new-admin-name" label="Name" errors={fieldErrors.name}>
              <Input
                id="new-admin-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field id="new-admin-email" label="Email" errors={fieldErrors.email}>
              <Input
                id="new-admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field
              id="new-admin-password"
              label="Temporary password"
              errors={fieldErrors.password}
              hint="At least 8 characters."
            >
              <Input
                id="new-admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </Field>
            <Field id="new-admin-role" label="Role" errors={fieldErrors.role}>
              <Select
                id="new-admin-role"
                value={role}
                onChange={(event) => setRole(event.target.value as AssignableAdminRole)}
              >
                <option value="MODERATOR">Moderator — content moderation queue only</option>
                <option value="ADMIN">Admin — moderation and content</option>
                <option value="SUPER_ADMIN">Super Admin — plus accounts and roles</option>
              </Select>
            </Field>
          </div>

          <div className="flex gap-2">
            <Button type="submit" loading={create.isPending}>
              Create administrator
            </Button>
            <Button type="button" variant="outline" onClick={onDone} disabled={create.isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
