import type {
  AgentAutonomy,
  AgentKnowledgeSource,
  AgentProvider,
  AgentResponseStyle,
  AgentSettings,
  Integration,
  McpServer,
} from "@/types";

export const MODEL_PROVIDERS: {
  id: AgentProvider;
  models: string[];
}[] = [
  { id: "openai", models: ["gpt-5.6", "gpt-4.1", "gpt-4o"] },
  { id: "anthropic", models: ["claude-sonnet", "claude-opus", "claude-haiku"] },
  { id: "google", models: ["gemini-2.5-pro", "gemini-2.5-flash"] },
];

export const RESPONSE_STYLES: AgentResponseStyle[] = [
  "concise",
  "professional",
  "detailed",
];

export const AUTONOMY_LEVELS: AgentAutonomy[] = [
  "suggest_only",
  "execute_when_allowed",
  "fully_autonomous",
];

export type ApiAgentSettings = {
  instructions?: string;
  response_style?: string;
  autonomy?: string;
  tools?: string[] | null;
  knowledge?: {
    id?: string;
    name?: string;
    kind?: string;
    enabled?: boolean;
  }[];
  provider?: string;
  model?: string;
  temperature?: number;
  max_output?: number;
  environment?: string;
  region?: string;
  max_concurrent_runs?: number;
  max_tool_calls?: number;
  max_runtime_minutes?: number;
};

function asStyle(value: unknown): AgentResponseStyle {
  return RESPONSE_STYLES.includes(value as AgentResponseStyle)
    ? (value as AgentResponseStyle)
    : "professional";
}

function asAutonomy(value: unknown): AgentAutonomy {
  return AUTONOMY_LEVELS.includes(value as AgentAutonomy)
    ? (value as AgentAutonomy)
    : "execute_when_allowed";
}

function asProvider(value: unknown, model: string): AgentProvider {
  if (value === "openai" || value === "anthropic" || value === "google") {
    return value;
  }
  const name = model.toLowerCase();
  if (name.startsWith("gpt") || name.includes("openai")) return "openai";
  if (name.includes("gemini")) return "google";
  return "anthropic";
}

export function emptySettings(model = "claude-sonnet"): AgentSettings {
  return {
    instructions: "",
    responseStyle: "professional",
    autonomy: "execute_when_allowed",
    tools: null,
    knowledge: [],
    provider: asProvider(undefined, model),
    model,
    temperature: 0.2,
    maxOutput: 4000,
    environment: "",
    region: "",
    maxConcurrentRuns: 5,
    maxToolCalls: 50,
    maxRuntimeMinutes: 30,
  };
}

export function normalizeSettings(
  raw: ApiAgentSettings | null | undefined,
  model: string
): AgentSettings {
  const base = emptySettings(model);
  if (!raw) return base;
  const knowledge: AgentKnowledgeSource[] = Array.isArray(raw.knowledge)
    ? raw.knowledge
        .filter((item) => item && String(item.name || "").trim())
        .map((item, index) => ({
          id: String(item.id || `ks_${index}`),
          name: String(item.name).trim(),
          kind: "document",
          enabled: item.enabled !== false,
        }))
    : [];
  return {
    instructions: String(raw.instructions || ""),
    responseStyle: asStyle(raw.response_style),
    autonomy: asAutonomy(raw.autonomy),
    tools: Array.isArray(raw.tools) ? raw.tools.map(String) : null,
    knowledge,
    provider: asProvider(raw.provider, String(raw.model || model)),
    model: String(raw.model || model),
    temperature: Number.isFinite(Number(raw.temperature))
      ? Number(raw.temperature)
      : base.temperature,
    maxOutput: Number.isFinite(Number(raw.max_output))
      ? Number(raw.max_output)
      : base.maxOutput,
    environment: String(raw.environment || ""),
    region: String(raw.region || ""),
    maxConcurrentRuns: Number.isFinite(Number(raw.max_concurrent_runs))
      ? Number(raw.max_concurrent_runs)
      : base.maxConcurrentRuns,
    maxToolCalls: Number.isFinite(Number(raw.max_tool_calls))
      ? Number(raw.max_tool_calls)
      : base.maxToolCalls,
    maxRuntimeMinutes: Number.isFinite(Number(raw.max_runtime_minutes))
      ? Number(raw.max_runtime_minutes)
      : base.maxRuntimeMinutes,
  };
}

export function modelsForProvider(provider: AgentProvider, current?: string) {
  const list = MODEL_PROVIDERS.find((item) => item.id === provider)?.models ?? [];
  if (current && !list.includes(current)) return [current, ...list];
  return list;
}

export function runtimeLabel(id: string | null | undefined) {
  if (!id) return "";
  const stripped = id.replace(/^runtime[_-]/i, "").replace(/[_-]/g, " ").trim();
  const name = stripped.replace(/\b\w/g, (char) => char.toUpperCase());
  if (!name) return id;
  return /runtime/i.test(id) ? `${name} Runtime` : name;
}

export function toolLabel(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1) : name;
}

export function groupAgentTools(
  servers: McpServer[],
  integrations: Integration[]
): { id: string; name: string; tools: { name: string; label: string }[] }[] {
  const seen = new Set<string>();
  const groups: { id: string; name: string; tools: { name: string; label: string }[] }[] = [];
  for (const server of servers) {
    const tools = (server.tools ?? []).filter((name) => name && !seen.has(name));
    if (tools.length === 0) continue;
    tools.forEach((name) => seen.add(name));
    groups.push({
      id: server.id,
      name: server.name,
      tools: tools.map((name) => ({ name, label: toolLabel(name) })),
    });
  }
  const leftover = integrations
    .map((item) => item.name)
    .filter((name) => name && !seen.has(name));
  if (leftover.length > 0) {
    leftover.forEach((name) => seen.add(name));
    groups.push({
      id: "other",
      name: "Other",
      tools: leftover.map((name) => ({ name, label: toolLabel(name) })),
    });
  }
  return groups;
}

export function newKnowledgeId() {
  return `ks_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}
