"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  photo?: string | null;
  status: string;
  employeeTitle?: string;
  role?: string;
  permissions?: {
    agents: "none" | "read" | "write";
    policies: "none" | "read" | "write";
    approvals: "none" | "read" | "write";
    team: "none" | "read" | "write";
  };
  agentEditIds?: string[] | null;
  locale?: string;
  mfaSetupRequired?: boolean;
  agents?: { id: string; name: string }[];
  mcpServers?: { id: string; name: string }[];
}

export interface AuthOrg {
  id: string;
  name: string;
  plan?: string;
  kind?: "personal" | "organization" | string;
  photo?: string | null;
  entitlements?: {
    gateway: boolean;
    tool_set_limit: number | null;
    policies: boolean;
    webhooks?: boolean;
    audit: string;
    audit_days: number | null;
  };
}

export interface AuthSession {
  token: string | null;
  user: AuthUser;
  org: AuthOrg;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  org: AuthOrg | null;
  hydrated: boolean;
  setSession: (session: AuthSession) => void;
  clearToken: () => void;
  clear: () => void;
  setHydrated: (hydrated: boolean) => void;
}

function withoutPhoto<T extends { photo?: string | null }>(value: T | null): T | null {
  return value ? { ...value, photo: null } : value;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      org: null,
      hydrated: false,
      setSession: (session) =>
        set({
          token: session.token,
          user: session.user,
          org: session.org,
        }),
      clearToken: () => set({ token: null }),
      clear: () => set({ token: null, user: null, org: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "saturn-auth",
      version: 2,
      migrate: (persisted) => {
        if (persisted && typeof persisted === "object") {
          const next = { ...(persisted as { token?: unknown }) };
          delete next.token;
          return next as AuthState;
        }
        return persisted as AuthState;
      },
      // Photos are data URLs of up to several hundred kilobytes. Keeping them out of
      // localStorage avoids rewriting them on every session refresh; the avatar shows initials
      // for a moment after a reload, until the session check returns the photo again.
      partialize: (state) => ({
        user: withoutPhoto(state.user),
        org: withoutPhoto(state.org),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.token = null;
        state?.setHydrated(true);
      },
    }
  )
);

export function getSession(): AuthSession | null {
  const state = useAuthStore.getState();
  if (!state.user || !state.org) return null;
  return { token: state.token, user: state.user, org: state.org };
}
