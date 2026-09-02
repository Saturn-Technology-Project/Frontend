"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { consoleQueryKey } from "@/hooks/use-console";
import { useAuthStore } from "@/stores/auth-store";
import { usePanelStore } from "@/stores/panel-store";

function panelSocketUrl(token: string): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, "");
  if (explicit) {
    return `${explicit}/ws/panel?token=${encodeURIComponent(token)}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    const port = process.env.NEXT_PUBLIC_API_PORT || "8000";
    return `${proto}//${host}:${port}/ws/panel?token=${encodeURIComponent(token)}`;
  }
  return `${proto}//${window.location.host}/saturn-api/ws/panel?token=${encodeURIComponent(token)}`;
}

export function usePanelSocket() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const setSocketConnected = usePanelStore((state) => state.setSocketConnected);
  const setSnapshot = usePanelStore((state) => state.setSnapshot);
  const setAgent = usePanelStore((state) => state.setAgent);
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
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as {
            type?: string;
            agent_id?: string;
            agents?: { id: string; connected?: boolean }[];
          };
          if (message.type === "snapshot") {
            setSnapshot(
              (message.agents ?? [])
                .filter((agent) => agent.connected !== false)
                .map((agent) => agent.id)
            );
            return;
          }
          if (message.type === "agent.online" && message.agent_id) {
            setAgent(message.agent_id, true);
            return;
          }
          if (message.type === "agent.offline" && message.agent_id) {
            setAgent(message.agent_id, false);
            return;
          }
          if (message.type === "run.updated") {
            void queryClient.invalidateQueries({ queryKey: consoleQueryKey });
          }
        } catch {
          return;
        }
      };
      socket.onclose = () => {
        setSocketConnected(false);
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
      setSocketConnected(false);
    };
  }, [token, queryClient, reset, setAgent, setSnapshot, setSocketConnected]);
}
