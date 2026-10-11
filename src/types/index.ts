export type RunStatus =
  | "queued"
  | "running"
  | "awaiting_execution"
  | "awaiting_approval"
  | "executing"
  | "completed"
  | "failed"
  | "rejected";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled" | "invalidated";
export type ToolConnection = "connected" | "degraded" | "disconnected";
export type ToolPermission = "allow" | "approval" | "denied";
export type ActorKind = "agent" | "human" | "saturn" | "tool" | "wallet";
export type ServiceStatus = "operational" | "degraded" | "down";

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
  running: boolean;
  connected: boolean;
  enrolled?: boolean;
  runtimeId?: string | null;
  lastHeartbeatAt?: string | null;
  model: string;
  toolIds: string[];
  toolSetId: string | null;
  profileId: string | null;
  origin: string | null;
  clientId: string | null;
  registeredUserName: string | null;
  registeredUserEmail: string | null;
  policyIds: string[];
  settings: AgentSettings;
}

export interface ToolFunction {
  name: string;
  permission: ToolPermission;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  toolCount: number;
  status: ToolConnection;
  functions: ToolFunction[];
}

export interface McpTool {
  id: string;
  name: string;
  description: string;
}

export interface McpServer {
  id: string;
  name: string;
  endpoint: string;
  status: ToolConnection;
  tools: string[];
  catalog: McpTool[];
  connected: boolean;
  hasAuthorization: boolean;
}

export interface ToolSetItem {
  toolId: string;
  name: string;
  description: string;
  serverId: string | null;
  serverName: string;
  approval: boolean;
  inputSchema?: Record<string, unknown>;
}

export interface ToolSet {
  id: string;
  name: string;
  description: string;
  items: ToolSetItem[];
}

export type PolicyAction = "allow" | "approval_required" | "deny";
export type PolicyStatus = "active" | "paused" | "draft" | "validated";
export type PolicyNodeKind = "subject" | "tool" | "condition" | "logic" | "decision" | "enforcement";

export interface PolicyGraphNode {
  id: string;
  type: PolicyNodeKind;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface PolicyGraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface PolicyAnalysis {
  tool: string;
  status: "analyzed" | "unclassified" | "insufficient" | string;
  operation?: string;
  resource?: string;
  risk?: string;
  sideEffects?: string;
  decision?: string;
  rationale?: string;
}

export interface PolicyDefinition {
  toolSetId?: string;
  nodes: PolicyGraphNode[];
  edges: PolicyGraphEdge[];
  analyses: PolicyAnalysis[];
}

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
  toolSetId?: string | null;
  definition?: PolicyDefinition | null;
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
  arguments?: Record<string, unknown>;
  risk?: "low" | "medium" | "high";
  status: ApprovalStatus;
  requiredCount?: number;
  approvedCount?: number;
  requirements?: {
    groupId: string;
    groupName: string;
    requiredCount: number;
    approvedCount: number;
  }[];
  executionState?: string;
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
  actionId?: string;
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

export interface AppMcpTool {
  toolId: string;
  description: string;
}

export interface AppMcpServer {
  id: string;
  name: string;
  url: string;
  tools: AppMcpTool[];
}

export interface AppMcp {
  servers: AppMcpServer[];
  attachments: Record<string, string[]>;
}

export interface ConsoleData {
  agents: Agent[];
  integrations: Integration[];
  mcpServers: McpServer[];
  appMcp: AppMcp;
  toolSets: ToolSet[];
  policies: Policy[];
  runs: AgentRun[];
  approvals: Approval[];
  events: ActivityEvent[];
  services: SystemService[];
}
