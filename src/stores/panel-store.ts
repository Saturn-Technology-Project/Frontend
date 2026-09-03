"use client";

import { create } from "zustand";

type PanelMessage = Record<string, unknown>;

interface PanelState {
  socketConnected: boolean;
  agents: Record<string, boolean>;
  heartbeats: Record<string, string>;
  connectorConnected: boolean;
  connectorId: string | null;
  connectorHeartbeat: string | null;
  send: ((message: PanelMessage) => boolean) | null;
  setSocketConnected: (value: boolean) => void;
  setSend: (send: ((message: PanelMessage) => boolean) | null) => void;
  setSnapshot: (
    ids: string[],
    heartbeats?: Record<string, string>,
    connector?: { id?: string | null; connected?: boolean; last_heartbeat_at?: string | null } | null
  ) => void;
  setAgent: (id: string, connected: boolean) => void;
  setHeartbeat: (id: string, at: string) => void;
  setConnector: (input: {
    id?: string | null;
    connected?: boolean;
    lastHeartbeatAt?: string | null;
  }) => void;
  reset: () => void;
}

export const usePanelStore = create<PanelState>((set) => ({
  socketConnected: false,
  agents: {},
  heartbeats: {},
  connectorConnected: false,
  connectorId: null,
  connectorHeartbeat: null,
  send: null,
  setSocketConnected: (socketConnected) => set({ socketConnected }),
  setSend: (send) => set({ send }),
  setSnapshot: (ids, heartbeats = {}, connector = null) =>
    set({
      agents: Object.fromEntries(ids.map((id) => [id, true])),
      heartbeats,
      connectorConnected: Boolean(connector?.connected),
      connectorId: connector?.id ?? null,
      connectorHeartbeat: connector?.last_heartbeat_at ?? null,
    }),
  setAgent: (id, connected) =>
    set((state) => ({
      agents: { ...state.agents, [id]: connected },
      heartbeats: connected ? state.heartbeats : { ...state.heartbeats, [id]: "" },
    })),
  setHeartbeat: (id, at) =>
    set((state) => ({
      heartbeats: { ...state.heartbeats, [id]: at },
    })),
  setConnector: ({ id, connected, lastHeartbeatAt }) =>
    set((state) => ({
      connectorId: id === undefined ? state.connectorId : id,
      connectorConnected: connected ?? state.connectorConnected,
      connectorHeartbeat:
        lastHeartbeatAt === undefined ? state.connectorHeartbeat : lastHeartbeatAt,
    })),
  reset: () =>
    set({
      socketConnected: false,
      agents: {},
      heartbeats: {},
      connectorConnected: false,
      connectorId: null,
      connectorHeartbeat: null,
      send: null,
    }),
}));
