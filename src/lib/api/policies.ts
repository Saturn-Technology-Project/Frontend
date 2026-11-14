import { useAuthStore } from "@/lib/auth";
import type { PolicyDefinition } from "@/types";
import { API_BASE, ApiError, apiErrorMessage, del, patch, post } from "./transport";
import type { ApiPolicy } from "./types";

export interface PolicyWrite {
  name: string;
  description?: string;
  environment?: string;
  status?: string;
  agent_ids?: string[];
  tool?: string;
  tool_set_id?: string | null;
  definition?: ApiPolicy["definition"];
  rules?: {
    tool?: string;
    condition?: string;
    conditions?: { field: string; operator: string; value: string | number | boolean }[];
    decision: string;
  }[];
}

export async function createPolicy(body: PolicyWrite): Promise<ApiPolicy> {
  return post<ApiPolicy>("/policies", body);
}

export async function updatePolicy(id: string, body: Partial<PolicyWrite>): Promise<ApiPolicy> {
  return patch<ApiPolicy>(`/policies/${id}`, body);
}

export function deletePolicy(id: string) {
  return del(`/policies/${id}`);
}

export function generatePolicy(toolSetId: string, instructions = "", name?: string) {
  return post<ApiPolicy>("/policies/generate", {
    tool_set_id: toolSetId,
    name: name ?? "",
    instructions,
  });
}

export interface PolicyStreamEvent {
  type: string;
  text?: string;
  code?: string;
  name?: string;
  count?: number;
  start?: number;
  end?: number;
  total?: number;
  done?: number;
  failed?: number;
  message?: string;
  policy?: ApiPolicy;
  definition?: PolicyDefinition;
  diff?: PolicyDiff[];
}

export async function streamPolicy(
  path: string,
  body: unknown,
  onEvent: (event: PolicyStreamEvent) => void
): Promise<PolicyStreamEvent> {
  const headers = new Headers({ "Content-Type": "application/json", Accept: "text/event-stream" });
  const token = useAuthStore.getState().token;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    const parsed = await apiErrorMessage(response);
    throw new ApiError(response.status, parsed.message, parsed.migration);
  }
  if (!response.body) throw new ApiError(response.status, "Request failed");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done: PolicyStreamEvent | null = null;
  for (;;) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value, { stream: !chunk.done });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((item) => item.startsWith("data:"));
      if (!line) continue;
      const event = JSON.parse(line.slice(5).trim()) as PolicyStreamEvent;
      if (event.type === "error") throw new ApiError(502, event.message || "Request failed");
      if (event.type === "policy" || event.type === "result") done = event;
      onEvent(event);
    }
    if (chunk.done) break;
  }
  if (!done) throw new ApiError(502, "Request failed");
  return done;
}

export function validatePolicy(id: string) {
  return post<{ report: PolicyValidation; policy: ApiPolicy }>(`/policies/${id}/validate`);
}

export function activatePolicy(id: string, confirm = false) {
  return post<ApiPolicy>(`/policies/${id}/activate`, { confirm });
}

export interface PolicyDiff {
  kind: "added" | "removed" | "changed";
  path: string;
  summary: string;
  before?: unknown;
  after?: unknown;
}

export function optimizePolicy(id: string, definition: PolicyDefinition, instructions = "") {
  return post<{ definition: PolicyDefinition; diff: PolicyDiff[] }>(`/policies/${id}/optimize`, {
    definition,
    instructions,
  });
}

export function simulatePolicy(id: string, tool: string, args: Record<string, unknown>, agentId?: string) {
  return post<{ decision: string; reason: string | null; ruleId: string | null }>(`/policies/${id}/simulate`, {
    tool,
    arguments: args,
    agent_id: agentId ?? null,
  });
}

export interface PolicyValidation {
  ok: boolean;
  toolCount: number;
  analyzed: number;
  unclassified: string[];
  insufficient: string[];
  issues: { level: string; code: string; message: string; tool?: string }[];
  probes: { tool: string; ok: boolean; message: string; expected?: string; actual?: string; arguments?: Record<string, unknown> }[];
  review?: PolicyReview;
}

export interface PolicyReview {
  allows: string[];
  approvals: string[];
  flagged_tools: { tool: string; reasons: string[] }[];
}
