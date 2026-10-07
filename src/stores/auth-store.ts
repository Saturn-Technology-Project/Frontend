"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
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
  agents?: { id: string; name: string }[];
  mcpServers?: { id: string; name: string }[];
}

export interface AuthOrg {
  id: string;
  name: string;
  plan?: string;
  kind?: "personal" | "organization" | string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  org: AuthOrg;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  org: AuthOrg | null;
  hydrated: boolean;
  setSession: (session: AuthSession) => void;
  clear: () => void;
  setHydrated: (hydrated: boolean) => void;
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
      clear: () => set({ token: null, user: null, org: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "saturn-auth",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        org: state.org,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export function getSession(): AuthSession | null {
  const state = useAuthStore.getState();
  if (!state.token || !state.user || !state.org) return null;
  return { token: state.token, user: state.user, org: state.org };
}
