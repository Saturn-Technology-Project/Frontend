"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { consoleQueryKey } from "@/hooks/use-console";
import { useAuthStore } from "@/stores/auth-store";
import { usePanelStore } from "@/stores/panel-store";
import { panelSocketUrl } from "@/lib/ws";

type PanelCommandResult = {
  type: string;
  id?: string;
  command?: string;
  agent_id?: string;
  delivered?: boolean;
  run?: { id: string; agent_id?: string; status?: string };
  error?: string;
};

const pending = new Map<
  string,
  { resolve: (value: PanelCommandResult) => void; reject: (error: Error) => void }
>();

function settle(id: string | undefined, message: PanelCommandResult) {
  if (!id) return;
  const waiter = pending.get(id);
  if (!waiter) return;
  pending.delete(id);
  if (message.type === "command.error" || message.error) {
    waiter.reject(new Error(message.error || "command_error"));
    return;
  }
  waiter.resolve(message);
}

export function sendPanelCommand(input: {
  command: string;
  agentId: string;
  input?: string;
  id?: string;
}): Promise<PanelCommandResult> {
  const id = input.id ?? `cmd_${crypto.randomUUID()}`;
  const send = usePanelStore.getState().send;
  if (!send) {
    return Promise.reject(new Error("panel_offline"));
  }
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(id);
      reject(new Error("timeout"));
    }, 20_000);
    pending.set(id, {
      resolve: (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      reject: (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    });
    const ok = send({
      type: "command",
      command: input.command,
      agent_id: input.agentId,
      input: input.input,
      id,
    });
    if (!ok) {
      pending.delete(id);
      window.clearTimeout(timer);
      reject(new Error("panel_offline"));
    }
  });
}

export function usePanelSocket() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const setSocketConnected = usePanelStore((state) => state.setSocketConnected);
  const setSend = usePanelStore((state) => state.setSend);
  const setSnapshot = usePanelStore((state) => state.setSnapshot);
  const setAgent = usePanelStore((state) => state.setAgent);
  const setHeartbeat = usePanelStore((state) => state.setHeartbeat);
  const setConnector = usePanelStore((state) => state.setConnector);
  const reset = usePanelStore((state) => state.reset);

  useEffect(() => {
    if (!token) {
      reset();
      return;
    }

    let closed = false;
    let socket: WebSocket | null = null;
    let retry: number | undefined;
    let delay = 500;

    function connect() {
      if (closed) return;
      socket = new WebSocket(panelSocketUrl(token as string));
      socket.onopen = () => {
        delay = 500;
        setSocketConnected(true);
        const current = socket;
        setSend((message) => {
          if (!current || current.readyState !== WebSocket.OPEN) return false;
          current.send(JSON.stringify(message));
          return true;
        });
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as {
            type?: string;
            id?: string;
            error?: string;
            command?: string;
            agent_id?: string;
            connector_id?: string;
            last_heartbeat_at?: string;
            delivered?: boolean;
            run?: { id: string; agent_id?: string; status?: string };
            connector?: {
              id?: string | null;
              connected?: boolean;
              last_heartbeat_at?: string | null;
            } | null;
            agents?: {
              id: string;
              connected?: boolean;
              last_heartbeat_at?: string | null;
            }[];
          };
          if (message.type === "snapshot") {
            const live = (message.agents ?? []).filter(
              (agent) => agent.connected !== false
            );
            setSnapshot(
              live.map((agent) => agent.id),
              Object.fromEntries(
                live
                  .filter((agent) => agent.last_heartbeat_at)
                  .map((agent) => [agent.id, agent.last_heartbeat_at as string])
              ),
              message.connector ?? null
            );
            return;
          }
          if (message.type === "agent.online" && message.agent_id) {
            setAgent(message.agent_id, true);
            void queryClient.invalidateQueries({ queryKey: consoleQueryKey });
            return;
          }
          if (message.type === "agent.offline" && message.agent_id) {
            setAgent(message.agent_id, false);
            return;
          }
          if (message.type === "connector.online") {
            setConnector({
              id: message.connector_id,
              connected: true,
            });
            void queryClient.invalidateQueries({ queryKey: consoleQueryKey });
            return;
          }
          if (message.type === "connector.offline") {
            setConnector({
              id: message.connector_id,
              connected: false,
            });
            return;
          }
          if (
            (message.type === "runtime.heartbeat" ||
              message.type === "connector.heartbeat") &&
            message.last_heartbeat_at
          ) {
            if (message.agent_id) {
              setHeartbeat(message.agent_id, message.last_heartbeat_at);
            }
            if (message.type === "connector.heartbeat") {
              setConnector({ lastHeartbeatAt: message.last_heartbeat_at });
            }
            return;
          }
          if (
            message.type === "catalog.updated" ||
            message.type === "run.updated"
          ) {
            void queryClient.invalidateQueries({ queryKey: consoleQueryKey });
            return;
          }
          if (message.type === "command.ack" || message.type === "command.error") {
            settle(message.id, {
              type: message.type,
              id: message.id,
              command: message.command,
              agent_id: message.agent_id,
              delivered: message.delivered,
              run: message.run,
              error: message.error,
            });
            if (message.type === "command.ack" && message.run) {
              void queryClient.invalidateQueries({ queryKey: consoleQueryKey });
            }
          }
        } catch {
          return;
        }
      };
      socket.onclose = () => {
        setSocketConnected(false);
        setSend(null);
        if (closed) return;
        retry = window.setTimeout(() => {
          delay = Math.min(delay * 2, 10_000);
          connect();
        }, delay);
      };
    }

    connect();
    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      socket?.close();
      setSend(null);
      setSocketConnected(false);
    };
  }, [
    token,
    queryClient,
    reset,
    setAgent,
    setHeartbeat,
    setSnapshot,
    setSocketConnected,
    setSend,
    setConnector,
  ]);
}
