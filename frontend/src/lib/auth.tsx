"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
).replace(/\/$/, "");

const ACCESS_TOKEN_KEY = "asip_access_token";
const REFRESH_TOKEN_KEY = "asip_refresh_token";

export type Role = "admin" | "org_owner" | "customer";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  customer_tier?: string;
  organization_id?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  roles: Role[];
  loading: boolean;
  isAdmin: boolean;
  displayName: string;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

function mapBackendRoles(backendRole: string): Role[] {
  const normalized = backendRole.toUpperCase();
  if (
    normalized === "ADMIN" ||
    normalized === "SUPER_ADMIN" ||
    normalized === "MODERATOR"
  ) {
    return ["admin"];
  }
  if (normalized === "ORGANIZATION_OWNER") {
    return ["org_owner"];
  }
  return ["customer"];
}

function extractApiError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  if (typeof record.message === "string") return record.message;
  if (record.error && typeof record.error === "object") {
    const errObj = record.error as Record<string, unknown>;
    if (typeof errObj.message === "string") return errObj.message;
  }
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0];
    }
  }
  return fallback;
}

const Ctx = createContext<AuthState>({
  user: null,
  roles: [],
  loading: true,
  isAdmin: false,
  displayName: "",
  accessToken: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (token: string) => {
    const res = await fetch(`${API_BASE_URL}/users/profile/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error("Session expired");
    }
    const payload = await res.json();
    const profile = (payload?.data ?? payload) as AuthUser;
    setUser(profile);
    setRoles(mapBackendRoles(profile.role));
    setAccessToken(token);
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      const storedAccess =
        typeof window !== "undefined"
          ? localStorage.getItem(ACCESS_TOKEN_KEY)
          : null;
      if (!storedAccess) {
        if (active) setLoading(false);
        return;
      }
      try {
        await loadProfile(storedAccess);
      } catch {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        if (active) {
          setUser(null);
          setRoles([]);
          setAccessToken(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(extractApiError(payload, "Invalid email or password."));
      }
      const tokens = (payload?.data ?? payload) as Record<string, unknown>;
      const nextAccess = tokens.access_token as string;
      const nextRefresh = tokens.refresh_token as string;
      if (!nextAccess) {
        throw new Error("Authentication server did not return an access token.");
      }
      localStorage.setItem(ACCESS_TOKEN_KEY, nextAccess);
      if (nextRefresh) {
        localStorage.setItem(REFRESH_TOKEN_KEY, nextRefresh);
      }
      await loadProfile(nextAccess);
    },
    [loadProfile],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(extractApiError(data, "Unable to create account."));
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(refresh ? { refresh_token: refresh } : {}),
      }).catch(() => {});
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
    setRoles([]);
    setAccessToken(null);
  }, []);

  const displayName = user?.name || user?.email?.split("@")[0] || "";

  return (
    <Ctx.Provider
      value={{
        user,
        roles,
        loading,
        isAdmin: roles.includes("admin"),
        displayName,
        accessToken,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);