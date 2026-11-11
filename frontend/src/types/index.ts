export type { OrgView } from "@/lib/metrics";
export type UserRole = "admin" | "org_owner" | "customer";
export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };
