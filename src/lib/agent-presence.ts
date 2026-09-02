import type { Agent } from "@/types";
import type { StatusTone } from "@/components/ui/status-dot";

export function agentConnected(
  agent: Agent,
  live: Record<string, boolean>
): boolean {
  return live[agent.id] ?? agent.connected;
}

export function agentPresence(
  agent: Agent,
  live: Record<string, boolean>,
  t: (path: string) => string
): { tone: StatusTone; label: string } {
  if (agent.running) {
    return { tone: "running", label: t("agents.running") };
  }
  if (agent.status === "paused") {
    return { tone: "paused", label: t("agents.paused") };
  }
  if (agentConnected(agent, live)) {
    return { tone: "connected", label: t("agents.connected") };
  }
  return { tone: "disconnected", label: t("agents.offline") };
}
