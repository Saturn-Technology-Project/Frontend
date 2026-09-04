export type AgentStatus = "active" | "paused";
export type RunStatus =
  | "running"
  | "awaiting_execution"
  | "awaiting_approval"
  | "executing"
  | "completed"
  | "failed"
  | "rejected";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ToolConnection = "connected" | "degraded" | "disconnected";
export type ToolPermission = "allow" | "approval" | "denied";
export type ActorKind = "agent" | "human" | "saturn" | "tool" | "wallet";
export type ServiceStatus = "operational" | "degraded" | "down";
export type WalletStatus = "active" | "paused";
export type PaymentStatus = "pending" | "verified" | "settled" | "denied" | "failed";

export type AgentResponseStyle = "concise" | "professional" | "detailed";
export type AgentAutonomy =
  | "suggest_only"
  | "execute_when_allowed"
  | "fully_autonomous";
export type AgentProvider = "openai" | "google" | "deepseek" | "anthropic" | "custom";

export interface AgentKnowledgeSource {
  id: string;
  name: string;
  kind: "document";
  enabled: boolean;
}

export interface AgentSettings {
  instructions: string;
  responseStyle: AgentResponseStyle;
  autonomy: AgentAutonomy;
  tools: string[] | null;
  knowledge: AgentKnowledgeSource[];
  provider: AgentProvider;
  model: string;
  baseUrl: string;
  temperature: number;
  maxOutput: number;
  environment: string;
  region: string;
  maxConcurrentRuns: number;
  maxToolCalls: number;
  maxRuntimeMinutes: number;
}

export interface Agent {
  id: string;
  name: string;
  title: string;
  description: string;
  status: AgentStatus;
  running: boolean;
  connected: boolean;
  enrolled?: boolean;
  connectorId?: string | null;
  runtimeId?: string | null;
  lastHeartbeatAt?: string | null;
  model: string;
  toolIds: string[];
  policyIds: string[];
  walletId?: string;
  settings: AgentSettings;
}

export interface ToolFunction {
  name: string;
  permission: ToolPermission;
}

export interface X402Price {
  price: string;
  network: string;
  asset: string;
  payTo?: string;
  scheme?: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  toolCount: number;
  status: ToolConnection;
  functions: ToolFunction[];
  x402?: X402Price;
  connectorId?: string | null;
}

export interface Connector {
  id: string | null;
  name: string;
  enrolled: boolean;
  connected: boolean;
  environmentId?: string;
  lastHeartbeatAt?: string | null;
}

export interface McpServer {
  id: string;
  name: string;
  endpoint: string;
  status: ToolConnection;
  tools: string[];
  connected: boolean;
}

export interface AgentWallet {
  id: string;
  agentId: string;
  address: string;
  network: string;
  asset: string;
  balance: string;
  dailySpendLimit: string;
  perTxLimit: string;
  spentToday: string;
  status: WalletStatus;
  updatedAt: string;
}

export interface Payment {
  id: string;
  walletId: string;
  runId?: string;
  actionId?: string;
  tool?: string;
  amount: string;
  asset: string;
  network: string;
  payTo: string;
  status: PaymentStatus;
  txHash?: string;
  createdAt: string;
  settledAt?: string;
}

export interface X402Support {
  scheme: string;
  network: string;
}

export type PolicyAction = "allow" | "approval_required" | "deny";
export type PolicyStatus = "active" | "paused";

export interface PolicyCondition {
  field: string;
  operator: string;
  value: string | number | boolean;
}

export interface PolicyRule {
  id: string;
  tool: string;
  condition: string;
  conditions: PolicyCondition[];
  decision: PolicyAction;
  position: number;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  status: PolicyStatus;
  version: number;
  environment: string;
  agentIds: string[];
  agents: string[];
  tools: string[];
  rules: PolicyRule[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RunStep {
  id: string;
  label: string;
  tool?: string;
  status: "pending" | "running" | "completed";
  parameters?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface ProposedAction {
  id: string;
  label: string;
  kind: "email" | "ticket" | "refund" | "update";
  requiresApproval: boolean;
}

export interface PolicyCheck {
  id: string;
  name: string;
  status: "pass" | "approval" | "fail";
}

export interface PolicyEvaluation {
  id: string;
  tool: string;
  arguments: Record<string, unknown>;
  status: string;
  result?: Record<string, unknown>;
  decision: string | null;
  policyId?: string | null;
  policyName?: string;
  policyVersion?: number | null;
  matchedRuleId?: string | null;
  matchedRule?: string;
  reason?: string | null;
  approvalId?: string;
  approvalStatus?: ApprovalStatus;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface AgentRun {
  id: string;
  agentId: string;
  prompt: string;
  status: RunStatus;
  steps: RunStep[];
  actions: ProposedAction[];
  policyChecks: PolicyCheck[];
  evaluations: PolicyEvaluation[];
  approvalId?: string;
  startedAt: string;
  completedAt?: string;
}

export interface Approval {
  id: string;
  runId: string;
  actionId: string;
  agentId: string;
  action: string;
  amount?: string;
  currency?: string;
  customer: string;
  reason: string;
  policy: string;
  policyVersion?: number;
  triggeredRule?: string;
  risk?: "low" | "medium" | "high";
  status: ApprovalStatus;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ActivityEvent {
  id: string;
  at: string;
  event?: string;
  actor: string;
  actorId?: string;
  actorKind: ActorKind;
  title: string;
  titleKey?: string;
  detail?: string;
  detailKey?: string;
  runId?: string;
  approvalId?: string;
  tool?: string;
  result?: string;
  raw?: Record<string, unknown> | null;
  payload?: {
    input?: unknown;
    policy?: unknown;
    tool?: string;
    parameters?: unknown;
    result?: unknown;
    approval?: unknown;
    payment?: unknown;
  };
}

export interface SystemService {
  id: string;
  name: string;
  status: ServiceStatus;
}

export interface ConsoleData {
  agents: Agent[];
  integrations: Integration[];
  mcpServers: McpServer[];
  connector: Connector | null;
  policies: Policy[];
  runs: AgentRun[];
  approvals: Approval[];
  events: ActivityEvent[];
  services: SystemService[];
  wallets: AgentWallet[];
  payments: Payment[];
  x402: X402Support | null;
}
