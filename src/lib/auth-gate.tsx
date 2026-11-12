import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import type { JSX, ReactNode } from "react";

import { setUnauthorizedHandler } from "./api";
import { i18n } from "./i18n";
import { authClient } from "./auth-client";
import { config } from "./config";
import { readSetting, writeSetting } from "./flags";
import { clearQueryCache } from "./query-client";

/**
 * - `loading`: the stored session is still being read.
 * - `signedIn`: a valid session exists.
 * - `signedOut`: no session; show onboarding (first launch) or the sign-in screen.
 *
 * With sign-in off (`config.authEnabled` false) the status is always `signedOut` and
 * `canEnterApp` is true once onboarding is done.
 */
export type AuthStatus = "loading" | "signedIn" | "signedOut";

const ONBOARDED_SETTING = "onboarded";

interface AuthGate {
  status: AuthStatus;
  /** Sign-in is part of this app (`EXPO_PUBLIC_AUTH_ENABLED=1`). */
  authEnabled: boolean;
  /** The signed-in screens may show: signed in, or past onboarding when sign-in is off. */
  canEnterApp: boolean;
  /** The signed-in user's id, or null. */
  userId: string | null;
  /** True once the user has finished (or skipped) the first-launch onboarding. */
  hasOnboarded: boolean;
  completeOnboarding: () => void;
  /** Ends the session and returns to the sign-in screen (a no-op when sign-in is off). */
  signOut: () => Promise<{ error: string | null }>;
}

const AuthGateContext = createContext<AuthGate | null>(null);

function useOnboarding(): { hasOnboarded: boolean; completeOnboarding: () => void } {
  const [hasOnboarded, setHasOnboarded] = useState(() => readSetting(ONBOARDED_SETTING) === "1");
  const completeOnboarding = useCallback(() => {
    writeSetting(ONBOARDED_SETTING, "1");
    setHasOnboarded(true);
  }, []);
  return { hasOnboarded, completeOnboarding };
}

/** Sign-in on: the Better Auth session decides. */
function SessionGateProvider({ children }: { children: ReactNode }): JSX.Element {
  const { data: session, isPending } = authClient.useSession();
  const { hasOnboarded, completeOnboarding } = useOnboarding();

  const userId = session?.user.id ?? null;

  // Drop cached data when the user signs out so the next user never sees it.
  useEffect(() => {
    if (!userId && !isPending) void clearQueryCache();
  }, [userId, isPending]);

  // A 401 from the API means the session is gone: end it so the app returns to sign-in.
  useEffect(() => {
    setUnauthorizedHandler(() => void authClient.signOut().catch(() => undefined));
    return () => setUnauthorizedHandler(null);
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await authClient.signOut();
      if (error) return { error: error.message ?? i18n.t("errors.signOut") };
    } catch {
      return { error: i18n.t("errors.network") };
    }
    return { error: null };
  }, []);

  const status: AuthStatus = session ? "signedIn" : isPending ? "loading" : "signedOut";
  const value = useMemo(
    () => ({
      status,
      authEnabled: true,
      canEnterApp: status === "signedIn",
      userId,
      hasOnboarded,
      completeOnboarding,
      signOut,
    }),
    [status, userId, hasOnboarded, completeOnboarding, signOut]
  );

  return <AuthGateContext value={value}>{children}</AuthGateContext>;
}

const signOutNoop = async (): Promise<{ error: string | null }> => ({ error: null });

/** Sign-in off: no session and no network; onboarding alone gates the app. */
function LocalGateProvider({ children }: { children: ReactNode }): JSX.Element {
  const { hasOnboarded, completeOnboarding } = useOnboarding();
  const value = useMemo(
    () => ({
      status: "signedOut" as const,
      authEnabled: false,
      canEnterApp: hasOnboarded,
      userId: null,
      hasOnboarded,
      completeOnboarding,
      signOut: signOutNoop,
    }),
    [hasOnboarded, completeOnboarding]
  );
  return <AuthGateContext value={value}>{children}</AuthGateContext>;
}

/** Provides `useAuthGate()`. Which gate runs is fixed at build time by `config.authEnabled`. */
export const AuthGateProvider = config.authEnabled ? SessionGateProvider : LocalGateProvider;

export function useAuthGate(): AuthGate {
  const value = use(AuthGateContext);
  if (!value) throw new Error("useAuthGate must be used inside AuthGateProvider");
  return value;
}
