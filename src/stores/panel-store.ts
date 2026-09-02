"use client";

import { create } from "zustand";

interface PanelState {
  socketConnected: boolean;
  agents: Record<string, boolean>;
  setSocketConnected: (value: boolean) => void;
  setSnapshot: (ids: string[]) => void;
  setAgent: (id: string, connected: boolean) => void;
  reset: () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  socketConnected: false,
  agents: {},
  setSocketConnected: (socketConnected) => set({ socketConnected }),
  setSnapshot: (ids) =>
    set({
      agents: Object.fromEntries(ids.map((id) => [id, true])),
    }),
  setAgent: (id, connected) =>
    set((state) => ({
      agents: { ...state.agents, [id]: connected },
    })),
  reset: () => set({ socketConnected: false, agents: {} }),
}));
