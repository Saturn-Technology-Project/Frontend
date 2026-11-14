import type { ApiAgentSettings } from "@/lib/agent-config";
import { mapConsole } from "@/lib/mappers";
import type { Agent, ConsoleData, Integration, Policy } from "@/types";
import type { ApiMcpServer, ApiToolSet } from "./mcp";
import { del, get, patch, post } from "./transport";
import type { ApiActivity, ApiAgent, ApiApproval, ApiHealth, ApiPolicy, ApiTool } from "./types";

export async function fetchConsole(): Promise<ConsoleData> {
  const [agents, tools, policies, approvals, activity, health, mcpServers, toolSets] =
    await Promise.all([
      get<ApiAgent[]>("/agents"),
      get<ApiTool[]>("/tools"),
      get<ApiPolicy[]>("/policies"),
      get<ApiApproval[]>("/approvals"),
      get<ApiActivity[]>("/activity"),
      // The service report is extra information. The console still loads when it cannot be read,
      // for instance against an API that does not serve /status yet.
      get<ApiHealth>("/status").catch(() => undefined),
      get<ApiMcpServer[]>("/mcp-servers").catch(() => []),
      get<ApiToolSet[]>("/tool-sets").catch(() => []),
    ]);

  return mapConsole({
    agents,
    tools,
    policies,
    approvals,
    activity,
    health,
    mcpServers: mcpServers ?? [],
    toolSets: toolSets ?? [],
  });
}

export async function fetchAgents(): Promise<Agent[]> {
  const data = await fetchConsole();
  return data.agents;
}

export async function fetchAgent(id: string): Promise<Agent | null> {
  const data = await fetchConsole();
  return data.agents.find((agent) => agent.id === id) ?? null;
}

export async function fetchIntegrations(): Promise<Integration[]> {
  const data = await fetchConsole();
  return data.integrations;
}

export async function fetchIntegration(id: string): Promise<Integration | null> {
  const data = await fetchConsole();
  return data.integrations.find((item) => item.id === id) ?? null;
}

export async function fetchPolicies(): Promise<Policy[]> {
  const data = await fetchConsole();
  return data.policies;
}

export async function fetchPolicy(id: string): Promise<Policy | null> {
  const data = await fetchConsole();
  return data.policies.find((item) => item.id === id) ?? null;
}

export async function fetchSystemStatus() {
  const data = await fetchConsole();
  return data.services;
}

export async function createAgent(body: {
  name: string;
  description?: string;
  model?: string;
}): Promise<ApiAgent> {
  return post<ApiAgent>("/agents", body);
}

export interface AgentUpdateBody {
  name?: string;
  description?: string;
  model?: string;
  runtime_id?: string | null;
  tool_set_id?: string | null;
  settings?: Partial<ApiAgentSettings>;
}

export async function updateAgent(
  id: string,
  body: AgentUpdateBody
): Promise<ApiAgent> {
  return patch<ApiAgent>(`/agents/${id}`, body);
}

export function deleteAgent(id: string) {
  return del(`/agents/${id}`);
}

export async function approveApproval(approvalId: string) {
  return post<{ status: string; action: string; result: string | null }>(
    `/approvals/${approvalId}/approve`
  );
}

export async function rejectApproval(approvalId: string) {
  return post<{ status: string; action: string; result: string | null }>(
    `/approvals/${approvalId}/reject`
  );
}

const EXPORT_PAGE = 5000;
const EXPORT_MAX_PAGES = 40;

/** The export is paged on the server. Read pages until a short one arrives. */
export async function exportActivity() {
  const rows: unknown[] = [];
  for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {
    const batch = await get<unknown[]>(`/activity/export?limit=${EXPORT_PAGE}&offset=${page * EXPORT_PAGE}`);
    rows.push(...batch);
    if (batch.length < EXPORT_PAGE) break;
  }
  return rows;
}
