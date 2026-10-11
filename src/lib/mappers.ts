import { getSession } from "@/lib/auth";
import type {
  ApiActivity,
  ApiAgent,
  ApiApproval,
  ApiHealth,
  ApiAppMcp,
  ApiMcpServer,
  ApiPolicy,
  ApiTool,
  ApiToolSet,
} from "@/lib/api";
import { normalizeSettings } from "@/lib/agent-config";
import {
  approvalRisk,
  formatMatchedRule,
  normalizeDecision,
} from "@/lib/policy";
import type {
  ActivityEvent,
  ActorKind,
  Agent,
  AppMcp,
  Approval,
  ConsoleData,
  Integration,
  McpServer,
  ToolSet,
  Policy,
  PolicyNodeKind,
  PolicyCondition,
  PolicyRule,
  SystemService,
  ToolPermission,
} from "@/types";

const EVENT_META: Record<string, { title: string; titleKey: string }> = {
  run_created: { title: "Started run", titleKey: "event.runCreated" },
  agent_started: { title: "Agent started", titleKey: "event.agentStarted" },
  tool_requested: { title: "Requested tool", titleKey: "event.toolRequested" },
  policy_evaluated: { title: "Policy evaluated", titleKey: "event.policyEvaluated" },
  approval_requested: {
    title: "Approval requested",
    titleKey: "event.approvalRequested",
  },
  approval_granted: { title: "Approved", titleKey: "event.approvalGranted" },
  approval_rejected: { title: "Rejected", titleKey: "event.approvalRejected" },
  tool_executed: { title: "Tool executed", titleKey: "event.toolExecuted" },
  run_completed: { title: "Run completed", titleKey: "event.runCompleted" },
  run_failed: { title: "Run failed", titleKey: "event.runFailed" },
  x402_payment_required: {
    title: "x402 payment required",
    titleKey: "event.x402PaymentRequired",
  },
  wallet_evaluated: {
    title: "Wallet evaluated",
    titleKey: "event.walletEvaluated",
  },
  x402_settled: { title: "x402 settled", titleKey: "event.x402Settled" },
  x402_failed: { title: "x402 failed", titleKey: "event.x402Failed" },
  prompt_updated: { title: "Updated prompt", titleKey: "event.promptUpdated" },
};

function formatAmount(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `$${n.toFixed(2)}`;
}

function decisionPermission(decision: string): ToolPermission {
  const key = decision.trim().toLowerCase();
  if (key === "deny") return "denied";
  if (key === "approval" || key === "approval_required") return "approval";
  return "allow";
}

function mapPolicyRule(rule: ApiPolicy["rules"][number]): PolicyRule {
  const conditions: PolicyCondition[] = (rule.conditions ?? []).map((item) => ({
    field: item.field,
    operator: item.operator,
    value: item.value,
  }));
  return {
    id: rule.id,
    tool: rule.tool,
    condition: rule.condition,
    conditions,
    decision: normalizeDecision(rule.decision),
    position: rule.position ?? 0,
  };
}

function mapPolicy(
  policy: ApiPolicy,
  agents: ApiAgent[]
): Policy {
  const rules = [...policy.rules]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(mapPolicyRule);
  const agentIds = policy.agent_ids ?? [];
  const agentNames = agentIds.map(
    (id) => agents.find((agent) => agent.id === id)?.name ?? id
  );
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description ?? "",
    status:
      policy.status === "draft" || policy.status === "paused" || policy.status === "validated"
        ? policy.status
        : "active",
    version: policy.version ?? 1,
    environment: policy.environment ?? "production",
    agentIds,
    agents: agentNames,
    tools: Array.from(new Set(rules.map((rule) => rule.tool).filter(Boolean))),
    toolSetId: policy.tool_set_id ?? policy.definition?.toolSetId ?? null,
    definition: policy.definition
      ? {
          toolSetId: policy.definition.toolSetId,
          nodes: policy.definition.nodes.map((node) => ({
            id: node.id,
            type: node.type as PolicyNodeKind,
            position: node.position,
            data: node.data ?? {},
          })),
          edges: policy.definition.edges,
          analyses: policy.definition.analyses ?? [],
        }
      : null,
    rules,
    createdAt: policy.created_at ?? undefined,
    updatedAt: policy.updated_at ?? undefined,
  };
}

function mapTools(tools: ApiTool[], policies: ApiPolicy[]): Integration[] {
  const rules = policies.flatMap((policy) => policy.rules);
  return tools.map((tool) => {
    const matched = rules.filter((rule) => rule.tool === tool.name);
    const functions =
      matched.length > 0
        ? matched.map((rule) => ({
            name: `${tool.name}  ${rule.condition}`,
            permission: decisionPermission(rule.decision),
          }))
        : [
            {
              name: tool.name,
              permission: "allow" as const,
            },
          ];

    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      endpoint: tool.mcp_endpoint,
      toolCount: functions.length,
      status: tool.status === "active" ? "connected" : "disconnected",
      functions,
    };
  });
}

function mapApproval(
  approval: ApiApproval,
  policies: ApiPolicy[],
  activity: ApiActivity[]
): Approval {
  const requested = activity.find(
    (event) => event.event === "approval_requested" && event.payload?.approval_id === approval.id
  );
  const evaluated = requested
    ? activity.find(
        (event) =>
          event.event === "policy_evaluated" &&
          event.tool === requested.tool &&
          event.payload?.audit_no === requested.payload?.audit_no
      )
    : undefined;
  const audited = evaluated?.payload ?? {};
  const tool = requested?.tool ?? undefined;
  const args = (requested?.payload?.arguments as Record<string, unknown> | undefined) ?? {};
  const customer = String(
    args.name ?? args.customer ?? args.customer_id ?? args.customerId ?? ""
  );
  const policyId = audited.policy_id as string | undefined;
  const policy =
    policies.find((item) => item.id === policyId) ??
    policies.find((item) => item.rules.some((rule) => rule.tool === tool));
  const ruleId = audited.matched_rule_id as string | undefined;
  const matched = policy?.rules.find((rule) => rule.id === ruleId);
  const amountValue = approval.requested_amount ?? args.amount;
  const currencyRaw = args.currency ?? args.asset;

  return {
    id: approval.id,
    runId: approval.run_id,
    actionId: approval.action_id,
    agentId: requested?.actor_id ?? "",
    action: tool ?? approval.action_id,
    amount: formatAmount(amountValue),
    currency:
      currencyRaw != null && String(currencyRaw).trim() ? String(currencyRaw) : undefined,
    customer,
    reason: String(audited.reason ?? "") || String(args.reason ?? ""),
    policy: policy?.name ?? "",
    policyVersion: (audited.policy_version as number | undefined) ?? policy?.version,
    triggeredRule: matched
      ? matched.conditions && matched.conditions.length > 0
        ? formatMatchedRule(matched.conditions)
        : matched.condition && matched.condition !== "true"
          ? matched.condition
          : undefined
      : undefined,
    arguments: args,
    risk: approvalRisk(amountValue),
    status: (
      ["pending", "approved", "rejected", "expired", "cancelled", "invalidated"].includes(approval.status)
        ? approval.status
        : "pending"
    ) as Approval["status"],
    requiredCount: approval.required_count ?? 1,
    approvedCount: approval.approved_count ?? 0,
    requirements: (approval.requirements ?? []).map((item) => ({
      groupId: item.group_id,
      groupName: item.group_name,
      requiredCount: item.required_count,
      approvedCount: item.approved_count,
    })),
    executionState: approval.execution_state ?? "none",
    requestedAt: approval.created_at,
    resolvedAt: approval.resolved_at ?? undefined,
    resolvedBy:
      approval.resolved_by === getSession()?.user.id
        ? getSession()?.user.name
        : (approval.resolved_by ?? undefined),
  };
}

function actorKindFor(event: string, actorType: string): ActorKind {
  if (event === "tool_executed") return "tool";
  if (
    actorType === "wallet" ||
    event.startsWith("x402_") ||
    event === "wallet_evaluated"
  ) {
    return "wallet";
  }
  if (actorType === "user") return "human";
  if (actorType === "agent") return "agent";
  return "saturn";
}

function mapActivity(event: ApiActivity, agents: ApiAgent[]): ActivityEvent {
  const meta = EVENT_META[event.event] ?? {
    title: event.event.replaceAll("_", " "),
    titleKey: undefined,
  };
  const kind = actorKindFor(event.event, event.actor_type);
  const payload = event.payload ?? {};
  const agent = agents.find((item) => item.id === event.actor_id);

  let actor = "Saturn";
  let actorId: string | undefined;
  if (kind === "tool") {
    actor = event.tool ?? "Tool";
  } else if (kind === "agent") {
    actor = agent?.name ?? event.actor_id ?? "Agent";
    actorId = event.actor_id ?? undefined;
  } else if (kind === "wallet") {
    actor = "Wallet";
    actorId = event.actor_id ?? undefined;
  } else if (kind === "human") {
    actor =
      event.actor_id === getSession()?.user.id
        ? getSession()?.user.name ?? "User"
        : (event.actor_id ?? "User");
  }

  const approvalId =
    typeof payload.approval_id === "string" ? payload.approval_id : undefined;
  const paymentId =
    typeof payload.payment_id === "string" ? payload.payment_id : undefined;

  return {
    id: event.id,
    at: event.created_at,
    event: event.event,
    actor,
    actorId,
    actorKind: kind,
    title: meta.title,
    titleKey: meta.titleKey,
    detail: event.result ?? event.tool ?? undefined,
    runId: event.run_id ?? (typeof payload.run_id === "string" ? payload.run_id : undefined),
    actionId: event.action_id ?? (typeof payload.action_id === "string" ? payload.action_id : undefined),
    approvalId,
    tool: event.tool ?? undefined,
    result: event.result ?? undefined,
    raw: event.payload,
    payload: {
      input: payload.input,
      policy: payload.policy_id
        ? {
            policy_id: payload.policy_id,
            policy_version: payload.policy_version,
            matched_rule_id: payload.matched_rule_id,
            reason: payload.reason,
            decision: event.result,
          }
        : undefined,
      tool: event.tool ?? undefined,
      parameters: payload.arguments,
      result: payload.result ?? event.result ?? undefined,
      approval: approvalId
        ? { id: approvalId, status: event.result }
        : undefined,
      payment: paymentId
        ? {
            id: paymentId,
            tx_hash: payload.tx_hash,
            amount: payload.amount,
            reason: payload.reason,
          }
        : payload.requirements ?? undefined,
    },
  };
}

function mapServices(health: ApiHealth | undefined): SystemService[] {
  const list = health?.services ?? [];
  const ok = health?.status === "ok";
  return list.map((service) => ({
    id: service.id,
    name: service.name,
    status: ok
      ? service.status === "degraded" || service.status === "down"
        ? service.status
        : service.status === "operational"
          ? "operational"
          : "degraded"
      : "down",
  }));
}

function mapAgent(agent: ApiAgent, tools: ApiTool[], policies: ApiPolicy[]): Agent {
  const assigned = Array.isArray(agent.settings?.tools)
    ? new Set(agent.settings.tools)
    : null;
  return {
    id: agent.id,
    name: agent.name,
    title: "Agent",
    description: agent.description,
    running: false,
    connected: Boolean(agent.connected),
    enrolled: Boolean(agent.enrolled),
    runtimeId: agent.runtime_id ?? null,
    lastHeartbeatAt: agent.last_seen_at ?? null,
    model: agent.model,
    toolIds: tools
      .filter((tool) => (assigned ? assigned.has(tool.name) : true))
      .map((tool) => tool.id),
    toolSetId: agent.tool_set_id ?? null,
    profileId: agent.profile_id ?? null,
    origin: agent.origin ?? null,
    clientId: agent.client_id ?? null,
    registeredUserName: agent.registered_user_name ?? null,
    registeredUserEmail: agent.registered_user_email ?? null,
    policyIds: policies
      .filter((policy) => {
        const ids = policy.agent_ids ?? [];
        return ids.length === 0 || ids.includes(agent.id);
      })
      .map((policy) => policy.id),
    settings: normalizeSettings(agent.settings, agent.model, agent),
  };
}

function mapMcpServers(servers: ApiMcpServer[]): McpServer[] {
  return servers.map((server) => ({
    id: server.id,
    name: server.name,
    endpoint: server.endpoint,
    status: server.connected || server.status === "active" ? "connected" : "disconnected",
    tools: server.tools ?? [],
    catalog: (server.catalog ?? []).map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description ?? "",
    })),
    connected: Boolean(server.connected),
    hasAuthorization: Boolean(server.has_authorization),
  }));
}

function mapAppMcp(input: ApiAppMcp | null | undefined): AppMcp {
  return {
    servers: (input?.servers ?? []).map((server) => ({
      id: server.id,
      name: server.name,
      url: server.url,
      tools: (server.tools ?? []).map((tool) => ({
        toolId: tool.tool_id,
        description: tool.description ?? "",
      })),
    })),
    attachments: input?.attachments ?? {},
  };
}

function mapToolSets(sets: ApiToolSet[]): ToolSet[] {
  return sets.map((set) => ({
    id: set.id,
    name: set.name,
    description: set.description ?? "",
    items: (set.items ?? []).map((item) => ({
      toolId: item.tool_id,
      name: item.name,
      description: item.description ?? "",
      serverId: item.server_id ?? null,
      serverName: item.server_name ?? "",
      approval: Boolean(item.approval),
      inputSchema: item.input_schema,
    })),
  }));
}

export function mapConsole(input: {
  agents: ApiAgent[];
  tools: ApiTool[];
  policies: ApiPolicy[];
  approvals: ApiApproval[];
  activity: ApiActivity[];
  health: ApiHealth;
  mcpServers?: ApiMcpServer[];
  toolSets?: ApiToolSet[];
  appMcp?: ApiAppMcp | null;
}): ConsoleData {
  return {
    agents: input.agents.map((agent) => mapAgent(agent, input.tools, input.policies)),
    integrations: mapTools(input.tools, input.policies),
    mcpServers: mapMcpServers(input.mcpServers ?? []),
    appMcp: mapAppMcp(input.appMcp),
    toolSets: mapToolSets(input.toolSets ?? []),
    policies: input.policies.map((policy) => mapPolicy(policy, input.agents)),
    runs: [],
    approvals: input.approvals.map((approval) =>
      mapApproval(approval, input.policies, input.activity)
    ),
    events: input.activity
      .map((event) => mapActivity(event, input.agents))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    services: mapServices(input.health),
  };
}
