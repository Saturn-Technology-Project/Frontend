import { useAuthStore } from "@/lib/auth";
import { mapConsole } from "@/lib/mappers";
import type { Agent, ConsoleData, Integration, Policy } from "@/types";

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
  status: string;
  connected?: boolean;
  last_seen_at?: string | null;
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

export interface ApiPolicyRule {
  tool: string;
  condition: string;
  decision: string;
}

export interface ApiPolicy {
  id: string;
  name: string;
  rules: ApiPolicyRule[];
}

export interface ApiAction {
  id: string;
  run_id: string;
  tool: string;
  arguments: Record<string, unknown>;
  policy_decision: string | null;
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
  organization: { id: string; name: string };
  enterprise: { id: string; name: string };
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
      agents: user.agents.map((agent) => ({ id: agent.id, name: agent.name })),
      mcpServers: user.mcp_servers.map((server) => ({
        id: server.id,
        name: server.name,
      })),
    },
    org: user.enterprise ?? user.organization,
  };
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
    const text = await response.text();
    throw new ApiError(response.status, text || response.statusText);
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
    organization: { id: string; name: string };
    catalog: { resources: { id: string; actions: string[] }[]; roles: { id: string; permissions: AccessPermissions }[] };
    me: OrgMember | null;
  }>("/org");
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
  const [agents, tools, policies, runs, approvals, activity, wallets, payments, x402, health] =
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

export async function createRun(agentId: string, prompt: string): Promise<ApiRun> {
  return post<ApiRun>("/runs", { agent_id: agentId, input: prompt });
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
