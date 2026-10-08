import { useAuthStore } from "@/lib/auth";
import { mapConsole } from "@/lib/mappers";
import type { Agent, ConsoleData, Integration, Policy } from "@/types";
import type { ApiAgentSettings } from "@/lib/agent-config";

const API_BASE = "/saturn-api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiAgent {
  id: string;
  name: string;
  description: string;
  model: string;
  connected?: boolean;
  enrolled?: boolean;
  runtime_id?: string | null;
  last_seen_at?: string | null;
  settings?: ApiAgentSettings;
  tool_set_id?: string | null;
  profile_id?: string | null;
  origin?: string | null;
  pushed?: boolean | null;
}

export interface ApiTool {
  id: string;
  name: string;
  description: string;
  type: string;
  mcp_endpoint: string;
  permissions: unknown[];
  x402?: Record<string, unknown> | null;
  status: string;
}

export interface ApiPolicyCondition {
  field: string;
  operator: string;
  value: string | number | boolean;
}

export interface ApiPolicyRule {
  id: string;
  tool: string;
  condition: string;
  conditions?: ApiPolicyCondition[];
  decision: string;
  position?: number;
}

export interface ApiPolicy {
  id: string;
  name: string;
  description?: string;
  status?: string;
  version?: number;
  environment?: string;
  agent_ids?: string[];
  rules: ApiPolicyRule[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ApiAction {
  id: string;
  run_id: string;
  tool: string;
  arguments: Record<string, unknown>;
  policy_decision: string | null;
  policy_id?: string | null;
  policy_rule_id?: string | null;
  policy_version?: number | null;
  policy_reason?: string | null;
  status: string;
  result: Record<string, unknown> | null;
}

export interface ApiRun {
  id: string;
  agent_id: string;
  input: string;
  status: string;
  approval_id: string | null;
  actions: ApiAction[];
  created_at: string;
  updated_at: string;
}

export interface ApiApproval {
  id: string;
  run_id: string;
  action_id: string;
  status: string;
  requested_amount: number | string | null;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ApiActivity {
  id: string;
  event: string;
  actor_type: string;
  actor_id: string | null;
  run_id: string | null;
  action_id: string | null;
  tool: string | null;
  result: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ApiWallet {
  id: string;
  agent_id: string;
  address: string;
  network: string;
  asset: string;
  balance: string | number;
  daily_spend_limit: string | number;
  per_tx_limit: string | number;
  spent_today: string | number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ApiPayment {
  id: string;
  wallet_id: string;
  run_id: string | null;
  action_id: string | null;
  tool: string | null;
  amount: string | number;
  asset: string;
  network: string;
  pay_to: string;
  status: string;
  tx_hash: string | null;
  requirements: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  facilitator: Record<string, unknown> | null;
  created_at: string;
  settled_at: string | null;
}

export interface ApiX402Supported {
  kinds: { scheme: string; network: string }[];
}

export interface ApiHealth {
  status: string;
  services?: { id: string; name: string; status: string }[];
}

export interface AccessPermissions {
  agents: "none" | "read" | "write";
  policies: "none" | "read" | "write";
  approvals: "none" | "read" | "write";
  team: "none" | "read" | "write";
}

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
  status: string;
  role: string | null;
  permissions: AccessPermissions;
  is_platform_admin?: boolean;
  organization: { id: string; name: string; plan?: string; kind?: string };
  enterprise: { id: string; name: string; plan?: string; kind?: string };
  employee: { id: string; title: string; status: string; role: string; permissions: AccessPermissions } | null;
  agents: { id: string; name: string; status: string }[];
  mcp_servers: {
    id: string;
    name: string;
    endpoint: string;
    status: string;
    connected?: boolean;
    tools: string[];
  }[];
  users?: { id: string; email: string; name: string; title: string; role: string; status: string }[];
  assigned_agent_ids?: string[];
  assigned_mcp_server_ids?: string[];
  agent_edit_ids?: string[] | null;
  mcp_gateway?: { status: string; connected: number; total: number };
}

export interface LoginResponse {
  token: string;
  user: AuthUserResponse;
}

export function toAuthSession(token: string, user: AuthUserResponse) {
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      employeeTitle: user.employee?.title,
      role: user.role ?? user.employee?.role ?? undefined,
      permissions: user.permissions,
      agentEditIds: user.agent_edit_ids ?? null,
      agents: user.agents.map((agent) => ({ id: agent.id, name: agent.name })),
      mcpServers: user.mcp_servers.map((server) => ({
        id: server.id,
        name: server.name,
      })),
    },
    org: {
      ...(user.organization),
      plan: user.organization.plan,
      kind: user.organization.kind,
    },
  };
}

function isSafeErrorText(value: string) {
  const text = value.trim();
  if (!text || text.length > 280) return false;
  if (text.startsWith("<")) return false;
  if (/traceback|exception|stack|at\s+\S+\s+\(/i.test(text)) return false;
  return true;
}

async function apiErrorMessage(response: Response): Promise<string> {
  const fallback = response.statusText || "Request failed";
  const text = await response.text();
  if (!text) return fallback;
  try {
    const body = JSON.parse(text) as { detail?: unknown; message?: unknown };
    if (typeof body.detail === "string" && isSafeErrorText(body.detail)) {
      return body.detail.trim();
    }
    if (Array.isArray(body.detail)) {
      const first = body.detail[0] as { msg?: unknown } | undefined;
      if (typeof first?.msg === "string" && isSafeErrorText(first.msg)) {
        return first.msg.trim();
      }
    }
    if (typeof body.message === "string" && isSafeErrorText(body.message)) {
      return body.message.trim();
    }
  } catch {
    if (isSafeErrorText(text)) return text.trim();
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = useAuthStore.getState().token;
  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 401 && auth && path !== "/auth/login") {
    useAuthStore.getState().clear();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await apiErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function get<T>(path: string) {
  return request<T>(path);
}

function post<T>(path: string, body?: unknown, auth = true) {
  return request<T>(
    path,
    {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    auth
  );
}

function patch<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

function del(path: string) {
  return request<void>(path, { method: "DELETE" });
}

export async function login(email: string, password: string) {
  const result = await post<LoginResponse>("/auth/login", { email, password }, false);
  useAuthStore.getState().setSession(toAuthSession(result.token, result.user));
  return result;
}

export async function logout() {
  try {
    await post<void>("/auth/logout");
  } finally {
    useAuthStore.getState().clear();
  }
}

export async function fetchMe() {
  const user = await get<AuthUserResponse>("/auth/me");
  const token = useAuthStore.getState().token;
  if (token) {
    useAuthStore.getState().setSession(toAuthSession(token, user));
  }
  return user;
}

export interface OrgMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  title: string;
  role: string;
  status: string;
  permissions: AccessPermissions;
  agent_ids: string[];
  agent_edit_ids?: string[] | null;
  mcp_server_ids: string[];
  created_at: string;
}

export interface OrgInvite {
  id: string;
  email: string;
  name: string;
  title: string;
  role: string;
  status: string;
  permissions: AccessPermissions;
  token?: string | null;
  expires_at: string;
}

export async function fetchOrg() {
  return get<{
    organization: {
      id: string;
      name: string;
      plan?: string;
      kind?: string;
      addons?: { id: string; name: string; href?: string | null }[];
    };
    catalog: { resources: { id: string; actions: string[] }[]; roles: { id: string; permissions: AccessPermissions }[] };
    me: OrgMember | null;
  }>("/org");
}

export interface SubscriptionLine {
  kind: "plan" | "addon" | string;
  id: string;
  name: string;
  amount: string;
}

export interface SubscriptionInvoice {
  id: string;
  number: string;
  period: string;
  issued_at: string;
  paid_at?: string | null;
  amount: string;
  currency: string;
  status: "open" | "paid" | string;
  lines: SubscriptionLine[];
}

export interface Subscription {
  organization_id: string;
  organization_name: string;
  status: string;
  plan: SubscriptionLine;
  addons: SubscriptionLine[];
  renews_on: string;
  payment: { brand: string; last4: string; exp: string; demo: boolean };
  invoices: SubscriptionInvoice[];
}

export async function fetchSubscription() {
  return get<Subscription>("/org/subscription");
}

export async function paySubscriptionInvoice(invoiceId: string) {
  return post<Subscription>(`/org/subscription/invoices/${invoiceId}/pay`);
}

export async function fetchOrgMembers() {
  return get<OrgMember[]>("/org/members");
}

export async function fetchOrgInvites() {
  return get<OrgInvite[]>("/org/invites");
}

export async function inviteOrgMember(body: {
  email: string;
  name: string;
  title?: string;
  role?: string;
  permissions?: AccessPermissions;
  agent_ids?: string[];
  mcp_server_ids?: string[];
}) {
  return post<OrgInvite>("/org/invites", body);
}

export async function updateOrgMember(
  employeeId: string,
  body: Partial<{
    name: string;
    title: string;
    role: string;
    permissions: AccessPermissions;
    status: string;
    agent_ids: string[];
    agent_edit_ids: string[];
    mcp_server_ids: string[];
  }>
) {
  return patch<OrgMember>(`/org/members/${employeeId}`, body);
}

export async function revokeOrgInvite(inviteId: string) {
  return del(`/org/invites/${inviteId}`);
}

export async function acceptInvite(token: string, password: string) {
  const result = await post<LoginResponse>("/auth/accept-invite", { token, password }, false);
  useAuthStore.getState().setSession(toAuthSession(result.token, result.user));
  return result;
}

export async function fetchConsole(): Promise<ConsoleData> {
  const [agents, tools, policies, runs, approvals, activity, wallets, payments, x402, health, mcpServers, toolSets, appMcp] =
    await Promise.all([
      get<ApiAgent[]>("/agents"),
      get<ApiTool[]>("/tools"),
      get<ApiPolicy[]>("/policies"),
      get<ApiRun[]>("/runs"),
      get<ApiApproval[]>("/approvals"),
      get<ApiActivity[]>("/activity"),
      get<ApiWallet[]>("/wallets"),
      get<ApiPayment[]>("/payments"),
      get<ApiX402Supported>("/x402/supported"),
      get<ApiHealth>("/health"),
      get<ApiMcpServer[]>("/mcp-servers").catch(() => []),
      get<ApiToolSet[]>("/tool-sets").catch(() => []),
      get<ApiAppMcp>("/app-mcp").catch(() => ({ servers: [], attachments: {} })),
    ]);

  return mapConsole({
    agents,
    tools,
    policies,
    runs,
    approvals,
    activity,
    wallets,
    payments,
    x402,
    health,
    mcpServers: mcpServers ?? [],
    toolSets: toolSets ?? [],
    appMcp: appMcp ?? { servers: [], attachments: {} },
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
  daily_spend_limit?: string | number;
  per_tx_limit?: string | number;
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

export function deleteMcpServer(id: string) {
  return del(`/mcp-servers/${id}`);
}

export interface ApiAppMcp {
  servers: { id: string; name: string; url: string; tools: { tool_id: string; description?: string }[] }[];
  attachments: Record<string, string[]>;
}

export interface ApiMcpServer {
  id: string;
  name: string;
  endpoint: string;
  status: string;
  connected?: boolean;
  gateway?: string;
  organization_id?: string | null;
  tools: string[];
  catalog?: { id: string; name: string; description?: string }[];
  has_authorization?: boolean;
}

export interface ApiToolSetItem {
  tool_id: string;
  name: string;
  description?: string;
  server_id?: string | null;
  server_name?: string;
  approval?: boolean;
  input_schema?: Record<string, unknown>;
}

export interface ApiToolSet {
  id: string;
  name: string;
  description?: string;
  items: ApiToolSetItem[];
}

export function connectMcpServer(body: { name: string; endpoint: string; authorization?: string }) {
  return post<ApiMcpServer>("/mcp-servers", body);
}

export function startMcpOauth(body: { name: string; endpoint: string; nonce: string }) {
  return post<{ authorization_url?: string | null; server?: ApiMcpServer | null }>("/mcp-servers/oauth/start", body);
}

export function refreshMcpServer(id: string) {
  return post<ApiMcpServer>(`/mcp-servers/${id}/refresh`);
}

export function createToolSet(body: {
  name: string;
  description?: string;
  items: { tool_id: string; approval: boolean }[];
}) {
  return post<ApiToolSet>("/tool-sets", body);
}

export function updateToolSet(
  id: string,
  body: {
    name?: string;
    description?: string;
    items?: { tool_id: string; approval: boolean }[];
  }
) {
  return patch<ApiToolSet>(`/tool-sets/${id}`, body);
}

export function deleteToolSet(id: string) {
  return del(`/tool-sets/${id}`);
}

export interface PolicyWrite {
  name: string;
  description?: string;
  environment?: string;
  status?: string;
  agent_ids?: string[];
  tool?: string;
  rules: {
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

export interface ConversationMessage {
  id: string;
  agent_id: string;
  input: string;
  output: string;
  status: string;
  actions: { toolId?: string; status?: string }[];
  error?: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchConversation(agentId: string): Promise<ConversationMessage[]> {
  return get<ConversationMessage[]>(`/agents/${agentId}/messages`);
}

export async function sendConversation(agentId: string, input: string): Promise<ConversationMessage> {
  return post<ConversationMessage>(`/agents/${agentId}/messages`, { input });
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
