import { queryOptions } from "@tanstack/react-query";
import type { AppNotification } from "../types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
).replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("asip_access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const notificationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<AppNotification[]> => {
      const headers = authHeaders();
      if (!headers.Authorization) return [];

      const res = await fetch(`${API_BASE_URL}/notifications/`, { headers });
      if (!res.ok) return [];

      const payload = await res.json().catch(() => ({}));
      const results = payload?.data?.results ?? payload?.results ?? payload?.data ?? payload;
      return Array.isArray(results) ? (results as AppNotification[]) : [];
    },
    refetchInterval: 60_000,
  });

export async function markRead(ids: string[]) {
  if (!ids.length) return;
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
  await Promise.all(
    ids.map((id) =>
      fetch(`${API_BASE_URL}/notifications/${id}/read/`, {
        method: "POST",
        headers,
      }).catch(() => {}),
    ),
  );
}

export async function markAllRead() {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
  await fetch(`${API_BASE_URL}/notifications/read-all/`, {
    method: "POST",
    headers,
  }).catch(() => {});
}