import { getSession } from "@/lib/auth";
import type {
  ApiAction,
  ApiActivity,
  ApiAgent,
  ApiApproval,
  ApiConnector,
  ApiHealth,
  ApiMcpServer,
  ApiPayment,
  ApiPolicy,
  ApiRun,
  ApiTool,
  ApiWallet,
  ApiX402Supported,
} from "@/lib/api";
import { parseAmount } from "@/lib/format";
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
  AgentRun,
  AgentWallet,
  Approval,
  Connector,
  ConsoleData,
  Integration,
  McpServer,
  Payment,
  PaymentStatus,
  Policy,
  PolicyCheck,
  PolicyCondition,
  PolicyEvaluation,
  PolicyRule,
  ProposedAction,
  RunStatus,
  RunStep,
  SystemService,
  ToolPermission,
  X402Price,
  X402Support,
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

function money(value: unknown): string {
  return parseAmount(value).toFixed(2);
}

function mapX402(config: Record<string, unknown> | null | undefined): X402Price | undefined {
  if (!config) return undefined;
  const price = config.price;
  if (price == null || price === "") return undefined;
  return {
    price: String(price),
    network: config.network != null ? String(config.network) : "",
    asset: config.asset != null ? String(config.asset) : "",
    payTo: config.pay_to ? String(config.pay_to) : undefined,
    scheme: config.scheme ? String(config.scheme) : undefined,
  };
}

function mapWallet(wallet: ApiWallet): AgentWallet {
  return {
    id: wallet.id,
    agentId: wallet.agent_id,
    address: wallet.address,
    network: wallet.network,
    asset: wallet.asset,
    balance: money(wallet.balance),
    dailySpendLimit: money(wallet.daily_spend_limit),
    perTxLimit: money(wallet.per_tx_limit),
    spentToday: money(wallet.spent_today),
    status: wallet.status === "paused" ? "paused" : "active",
    updatedAt: wallet.updated_at,
  };
}

function mapPayment(payment: ApiPayment): Payment {
  const status = (
    ["pending", "verified", "settled", "denied", "failed"].includes(payment.status)
      ? payment.status
      : "pending"
  ) as PaymentStatus;
  return {
    id: payment.id,
    walletId: payment.wallet_id,
    runId: payment.run_id ?? undefined,
    actionId: payment.action_id ?? undefined,
    tool: payment.tool ?? undefined,
    amount: money(payment.amount),
    asset: payment.asset,
    network: payment.network,
    payTo: payment.pay_to,
    status,
    txHash: payment.tx_hash ?? undefined,
    createdAt: payment.created_at,
    settledAt: payment.settled_at ?? undefined,
  };
}

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

function mapRunStatus(status: string): RunStatus {
  switch (status) {
    case "waiting_approval":
      return "awaiting_approval";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "rejected";
    default:
      return "running";
  }
}

function mapStepStatus(status: string): RunStep["status"] {
  if (
    status === "completed" ||
    status === "denied" ||
    status === "rejected" ||
    status === "failed"
  ) {
    return "completed";
  }
  if (status === "waiting_approval") return "running";
  return "pending";
}

function actionKind(tool: string): ProposedAction["kind"] {
  if (tool.includes("refund")) return "refund";
  if (tool.includes("email")) return "email";
  if (tool.includes("ticket")) return "ticket";
  return "update";
}

function formatActionLabel(action: ApiAction): string {
  const amount = formatAmount(action.arguments?.amount);
  if (amount) return `${action.tool}  ${amount}`;
  return action.tool;
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
    status: policy.status === "paused" ? "paused" : "active",
    version: policy.version ?? 1,
    environment: policy.environment ?? "production",
    agentIds,
    agents: agentNames,
    tools: Array.from(new Set(rules.map((rule) => rule.tool).filter(Boolean))),
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
      x402: mapX402(tool.x402),
    };
  });
}

function mapRun(
  run: ApiRun,
  policies: ApiPolicy[],
  approvals: ApiApproval[]
): AgentRun {
  const steps: RunStep[] = run.actions.map((action) => ({
    id: action.id,
    label: action.tool,
    tool: action.tool,
    status: mapStepStatus(action.status),
    parameters: action.arguments,
    result: action.result ?? undefined,
  }));

  const actions: ProposedAction[] = run.actions
    .filter(
      (action) =>
        action.policy_decision === "approval_required" ||
        action.status === "waiting_approval"
    )
    .map((action) => ({
      id: action.id,
      label: formatActionLabel(action),
      kind: actionKind(action.tool),
      requiresApproval: true,
    }));

  const policyChecks: PolicyCheck[] = run.actions
    .filter((action) => action.policy_decision)
    .map((action) => ({
      id: action.id,
      name: action.tool,
      status:
        action.policy_decision === "allow"
          ? "pass"
          : action.policy_decision === "deny"
            ? "fail"
            : "approval",
    }));

  const evaluations: PolicyEvaluation[] = run.actions.map((action) => {
    const policy =
      policies.find((item) => item.id === action.policy_id) ??
      policies.find((item) => item.rules.some((rule) => rule.tool === action.tool));
    const matched = policy?.rules.find((rule) => rule.id === action.policy_rule_id);
    const approval = approvals.find((item) => item.action_id === action.id);
    return {
      id: action.id,
      tool: action.tool,
      arguments: action.arguments,
      status: action.status,
      result: action.result ?? undefined,
      decision: action.policy_decision,
      policyId: action.policy_id,
      policyName: policy?.name,
      policyVersion: action.policy_version ?? policy?.version ?? null,
      matchedRuleId: action.policy_rule_id,
      matchedRule: matched
        ? matched.conditions && matched.conditions.length > 0
          ? formatMatchedRule(matched.conditions)
          : matched.condition
        : undefined,
      reason: action.policy_reason,
      approvalId: approval?.id,
      approvalStatus: approval
        ? ((["pending", "approved", "rejected"].includes(approval.status)
            ? approval.status
            : "pending") as Approval["status"])
        : undefined,
      resolvedBy: approval?.resolved_by ?? undefined,
      resolvedAt: approval?.resolved_at ?? undefined,
    };
  });

  const done =
    run.status === "completed" ||
    run.status === "failed" ||
    run.status === "cancelled";

  return {
    id: run.id,
    agentId: run.agent_id,
    prompt: run.input,
    status: mapRunStatus(run.status),
    steps,
    actions,
    policyChecks,
    evaluations,
    approvalId: run.approval_id ?? undefined,
    startedAt: run.created_at,
    completedAt: done ? run.updated_at : undefined,
  };
}

function mapApproval(
  approval: ApiApproval,
  run: ApiRun | undefined,
  policies: ApiPolicy[]
): Approval {
  const action = run?.actions.find((item) => item.id === approval.action_id);
  const args = action?.arguments ?? {};
  const customer = String(
    args.name ?? args.customer ?? args.customer_id ?? ""
  );
  const policy =
    policies.find((item) => item.id === action?.policy_id) ??
    policies.find((item) =>
      item.rules.some((rule) => rule.tool === action?.tool)
    );
  const matched = policy?.rules.find((rule) => rule.id === action?.policy_rule_id);
  const amountValue = approval.requested_amount ?? args.amount;

  return {
    id: approval.id,
    runId: approval.run_id,
    actionId: approval.action_id,
    agentId: run?.agent_id ?? "",
    action: action?.tool ?? approval.action_id,
    amount: formatAmount(amountValue),
    currency: amountValue != null ? "USD" : undefined,
    customer,
    reason:
      action?.policy_reason ||
      String(args.reason ?? run?.input ?? ""),
    policy: policy?.name ?? "",
    policyVersion: action?.policy_version ?? policy?.version,
    triggeredRule: matched
      ? matched.conditions && matched.conditions.length > 0
        ? formatMatchedRule(matched.conditions)
        : matched.condition
      : undefined,
    risk: approvalRisk(amountValue),
    status: (["pending", "approved", "rejected"].includes(approval.status)
      ? approval.status
      : "pending") as Approval["status"],
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
    runId: event.run_id ?? undefined,
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

function mapAgent(
  agent: ApiAgent,
  tools: ApiTool[],
  policies: ApiPolicy[],
  runs: ApiRun[],
  wallets: ApiWallet[]
): Agent {
  const live = runs.some(
    (run) =>
      run.agent_id === agent.id &&
      (run.status === "queued" ||
        run.status === "running" ||
        run.status === "waiting_approval")
  );

  const assigned = Array.isArray(agent.settings?.tools)
    ? new Set(agent.settings.tools)
    : null;

  return {
    id: agent.id,
    name: agent.name,
    title: "Agent",
    description: agent.description,
    status: agent.status === "paused" ? "paused" : "active",
    running: live,
    connected: Boolean(agent.connected),
    enrolled: Boolean(agent.enrolled),
    connectorId: agent.connector_id ?? null,
    runtimeId: agent.runtime_id ?? null,
    lastHeartbeatAt: agent.last_seen_at ?? null,
    model: agent.model,
    toolIds: tools
      .filter((tool) => (assigned ? assigned.has(tool.name) : true))
      .map((tool) => tool.id),
    policyIds: policies
      .filter((policy) => {
        const ids = policy.agent_ids ?? [];
        return ids.length === 0 || ids.includes(agent.id);
      })
      .map((policy) => policy.id),
    walletId: wallets.find((wallet) => wallet.agent_id === agent.id)?.id,
    settings: normalizeSettings(agent.settings, agent.model),
  };
}

function mapConnector(connector: ApiConnector | null): Connector | null {
  if (!connector) return null;
  return {
    id: connector.id,
    name: connector.name || "Saturn Connector",
    enrolled: Boolean(connector.enrolled),
    connected: Boolean(connector.connected),
    environmentId: connector.environment_id || "",
    lastHeartbeatAt: connector.last_seen_at ?? null,
  };
}

function mapMcpServers(servers: ApiMcpServer[]): McpServer[] {
  return servers.map((server) => ({
    id: server.id,
    name: server.name,
    endpoint: server.endpoint,
    status: server.connected || server.status === "active" ? "connected" : "disconnected",
    tools: server.tools ?? [],
    connected: Boolean(server.connected),
  }));
}

export function mapConsole(input: {
  agents: ApiAgent[];
  tools: ApiTool[];
  policies: ApiPolicy[];
  runs: ApiRun[];
  approvals: ApiApproval[];
  activity: ApiActivity[];
  wallets: ApiWallet[];
  payments: ApiPayment[];
  x402: ApiX402Supported | null;
  health: ApiHealth;
  connector?: ApiConnector | null;
  mcpServers?: ApiMcpServer[];
}): ConsoleData {
  const runsById = new Map(input.runs.map((run) => [run.id, run]));
  const kind = input.x402?.kinds?.[0];
  const x402: X402Support | null = kind
    ? { scheme: kind.scheme, network: kind.network }
    : null;

  return {
    agents: input.agents.map((agent) =>
      mapAgent(agent, input.tools, input.policies, input.runs, input.wallets)
    ),
    integrations: mapTools(input.tools, input.policies),
    mcpServers: mapMcpServers(input.mcpServers ?? []),
    connector: mapConnector(input.connector ?? null),
    policies: input.policies.map((policy) => mapPolicy(policy, input.agents)),
    runs: input.runs.map((run) => mapRun(run, input.policies, input.approvals)),
    approvals: input.approvals.map((approval) =>
      mapApproval(approval, runsById.get(approval.run_id), input.policies)
    ),
    events: input.activity.map((event) => mapActivity(event, input.agents)),
    services: mapServices(input.health),
    wallets: input.wallets.map(mapWallet),
    payments: input.payments.map(mapPayment),
    x402,
  };
}
