"use client";

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

export type AuthModalMode = "signin" | "signup";

/**
 * Sign in / Get started as a modal over the homepage.
 *
 * Both entry points previously navigated away to `/login` and `/register`,
 * which threw away the page the visitor was reading. The four homepage CTAs
 * (header, hero, closing section) all need to open the same two forms, so the
 * open/mode state is held once in a provider rather than duplicated per
 * trigger.
 *
 * The standalone `/login` and `/register` routes still exist: the proxy
 * redirects to `/login?next=…` when a protected page is opened signed out, and
 * that redirect is a full navigation and cannot be served by a modal.
 */

type AuthModalContextValue = {
  openAuthModal: (mode: AuthModalMode) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

const COPY = {
  signin: {
    title: "Welcome back",
    description: "Sign in to manage your organizations and insights.",
  },
  signup: {
    title: "Create your account",
    description: "Join as a customer, or register a business to manage its profile.",
  },
} as const satisfies Record<AuthModalMode, { title: string; description: string }>;

function AuthDialog({
  mode,
  onClose,
  onSwitchMode,
}: {
  mode: AuthModalMode;
  onClose: () => void;
  onSwitchMode: (mode: AuthModalMode) => void;
}) {
  const copy = COPY[mode];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {/* Both forms read `?next=` via `useSearchParams`, which opts into a
            client-side bailout. Radix only mounts `DialogContent` once open, so
            this boundary is never the thing that decides whether the homepage
            can be prerendered — it is here so the forms stay safe if that
            changes, and so the dialog never flashes empty while opening. */}
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          {mode === "signup" ? (
            <RegisterForm
              onSuccess={onClose}
              onSwitchMode={() => onSwitchMode("signin")}
            />
          ) : (
            <LoginForm
              onSuccess={onClose}
              onSwitchMode={() => onSwitchMode("signup")}
            />
          )}
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthModalMode | null>(null);

  const openAuthModal = useCallback((next: AuthModalMode) => setMode(next), []);

  const close = useCallback(() => setMode(null), []);

  const value = useMemo(() => ({ openAuthModal }), [openAuthModal]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {mode && (
        <AuthDialog
          mode={mode}
          onClose={close}
          // Switching modes replaces the form component, so its field values,
          // errors, and pending flags reset for free. Keying on mode would be
          // redundant, but the forms are also mounted/unmounted by the branch,
          // which is what actually guarantees the reset.
          onSwitchMode={setMode}
        />
      )}
    </AuthModalContext.Provider>
  );
}

/**
 * Opens the auth modal from any homepage CTA.
 *
 * Throws without a provider rather than silently no-op'ing: a CTA that looks
 * wired up but does nothing is worse than a loud failure.
 */
export function useAuthModal(): AuthModalContextValue {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an <AuthModalProvider>.");
  }
  return context;
}
