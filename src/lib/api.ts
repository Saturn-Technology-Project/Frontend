import { useAuthStore } from "@/lib/auth";
import { loginVerifier } from "@/lib/password";
import { localeRevisionNow, localeSavePending, useLocaleStore } from "@/stores/locale-store";
import { mapConsole } from "@/lib/mappers";
import type { Agent, ConsoleData, Integration, Policy, PolicyDefinition } from "@/types";
import type { ApiAgentSettings } from "@/lib/agent-config";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

const API_BASE = "/saturn-api";
const SATURN_AI_BASE =
  process.env.NEXT_PUBLIC_SATURN_AI_URL ?? "https://saturn-ai-629072855899.asia-east1.run.app";

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
  client_id?: string | null;
  registered_user_name?: string | null;
  registered_user_email?: string | null;
  pushed?: boolean | null;
}

export interface ApiTool {
  id: string;
  name: string;
  description: string;
  type: string;
  mcp_endpoint: string;
  permissions: unknown[];
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
  tool_set_id?: string | null;
  definition?: {
    toolSetId?: string;
    nodes: { id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }[];
    edges: { id: string; source: string; target: string }[];
    analyses: { tool: string; status: string; rationale?: string; operation?: string; resource?: string; risk?: string; sideEffects?: string; decision?: string }[];
  } | null;
  rules: ApiPolicyRule[];
  created_at?: string | null;
  updated_at?: string | null;
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
  required_count?: number;
  approved_count?: number;
  requirements?: {
    group_id: string;
    group_name: string;
    required_count: number;
    approved_count: number;
  }[];
  execution_state?: string;
  expires_at?: string | null;
  resubmit_expires_at?: string | null;
  expired_phase?: string | null;
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

export interface Entitlements {
  gateway: boolean;
  tool_set_limit: number | null;
  policies: boolean;
  webhooks?: boolean;
  groups?: boolean;
  audit: "basic" | "full" | string;
  audit_days: number | null;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
  photo?: string | null;
  status: string;
  role: string | null;
  permissions: AccessPermissions;
  is_platform_admin?: boolean;
  organization: { id: string; name: string; plan?: string; kind?: string; photo?: string | null; entitlements?: Entitlements };
  enterprise: { id: string; name: string; plan?: string; kind?: string; photo?: string | null; entitlements?: Entitlements };
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
  locale?: string;
  email_change_pending?: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUserResponse;
}

export interface LoginChallenge {
  mfa_required: true;
  challenge: string;
  methods: string[];
}

export interface MfaStatus {
  email_mfa: boolean;
  passkeys: { id: string; created_at: string }[];
}

export interface NoticeSettings {
  approval: boolean;
  execute: boolean;
  audit: boolean;
}

export function toAuthSession(token: string | null, user: AuthUserResponse) {
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      photo: user.photo ?? null,
      status: user.status,
      employeeTitle: user.employee?.title,
      role: user.role ?? user.employee?.role ?? undefined,
      permissions: user.permissions,
      agentEditIds: user.agent_edit_ids ?? null,
      locale: user.locale,
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
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401 && auth && path !== "/auth/login" && path !== "/auth/me") {
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

export type RecoveryBackup = {
  v: number;
  kdf: string;
  salt: string;
  nonce: string;
  ciphertext: string;
  org_key_version: number;
};

export type PayloadEnvelope = {
  v: number;
  org_key_version: number;
  nonce: string;
  ciphertext: string;
  wrapped_dek: string;
  content_sha256: string;
};

export type PayloadKeyStatus = {
  active_version: number | null;
  encryption_status: string;
  public_key: string | null;
  historical_note: string;
};

export function revealActivity(eventId: string) {
  return post<{ envelope?: PayloadEnvelope; decrypt?: string; arguments?: Record<string, unknown> }>(`/activity/${eventId}/reveal`, {});
}

export function fetchPayloadKeys() {
  return get<PayloadKeyStatus>("/org/payload-keys");
}

export function createPayloadKey(body: { public_key: string; backup: RecoveryBackup }) {
  return post("/org/payload-keys", body);
}

export type MemberBackup = {
  member_key_id: string;
  public_key: string;
  v: number;
  kdf: string;
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

export type PasswordBackup = {
  v: number;
  kdf: string;
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

export function fetchPayloadBackup() {
  return get<RecoveryBackup>("/org/payload-keys/backup");
}

export function fetchMemberBackup() {
  return get<MemberBackup>("/org/payload-keys/member/backup");
}

export function registerMemberPayloadKey(body: { public_key: string; backup: PasswordBackup; needs_assist?: boolean }) {
  return post<{ id: string; public_key: string }>("/org/payload-keys/member", body);
}

export type AssistRequest = {
  user_id: string;
  name: string;
  member_key_id: string;
  public_key: string;
};

export function fetchAssistRequests() {
  return get<{ requests: AssistRequest[] }>("/org/payload-keys/member/assist");
}

export type RewrapSource = {
  id: string;
  type: string;
  content_sha256: string;
  org_key_version: number;
  wrapped_dek: string;
  own_wrap: string;
};

export function fetchMemberRewrap(memberKeyId: string) {
  return get<{ records: RewrapSource[] }>(`/org/payload-keys/member/rewrap?member_key_id=${encodeURIComponent(memberKeyId)}`);
}

export function submitMemberRewrap(body: {
  member_key_id: string;
  records: { id: string; type: string; wrapped_dek: string; content_sha256: string }[];
}) {
  return post<{ migrated: number }>("/org/payload-keys/member/rewrap", body);
}

function patch<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

function del(path: string) {
  return request<void>(path, { method: "DELETE" });
}

async function establishSession(result: LoginResponse) {
  useAuthStore.getState().setSession(toAuthSession(null, result.user));
  try {
    await fetchMe();
  } catch {
    useAuthStore.getState().setSession(toAuthSession(result.token, result.user));
  }
}

export async function login(email: string, password: string): Promise<LoginResponse | LoginChallenge> {
  const result = await post<LoginResponse & Partial<LoginChallenge>>(
    "/auth/login",
    { email, password: await loginVerifier(password), locale: useLocaleStore.getState().locale },
    false
  );
  if (result.mfa_required && result.challenge) {
    return { mfa_required: true, challenge: result.challenge, methods: result.methods ?? [] };
  }
  if (!result.token || !result.user) {
    throw new ApiError(500, "Could not sign in");
  }
  const session = { token: result.token, user: result.user };
  await establishSession(session);
  return session;
}

export async function requestSignupCode(name: string, email: string, password: string) {
  return post<void>(
    "/auth/register/code",
    { name, email, password: await loginVerifier(password), locale: useLocaleStore.getState().locale },
    false
  );
}

export async function registerAccount(name: string, email: string, password: string, code: string) {
  const result = await post<LoginResponse>(
    "/auth/register",
    { name, email, password: await loginVerifier(password), code, locale: useLocaleStore.getState().locale },
    false
  );
  await establishSession(result);
  return result;
}

export async function loginWithEmailCode(challenge: string, code: string) {
  const result = await post<LoginResponse>("/auth/login/email", { challenge, code }, false);
  await establishSession(result);
  return result;
}

export async function loginWithPasskey(challenge: string) {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const options = await post<PublicKeyCredentialRequestOptionsJSON>(
    "/auth/login/passkey/options",
    { challenge },
    false
  );
  const credential = await startAuthentication({ optionsJSON: options });
  const result = await post<LoginResponse>("/auth/login/passkey", { challenge, credential }, false);
  await establishSession(result);
  return result;
}

export async function logout() {
  try {
    await post<void>("/auth/logout");
  } finally {
    const { clearMemberKey } = await import("@/lib/payload-crypto");
    clearMemberKey();
    useAuthStore.getState().clear();
  }
}

export async function updateProfile(body: { name: string; email: string }) {
  const user = await patch<AuthUserResponse>("/auth/me", body);
  useAuthStore.getState().setSession(toAuthSession(useAuthStore.getState().token, user));
  return user;
}

export async function updatePersonalPhoto(photo: string | null) {
  const user = await patch<AuthUserResponse>("/auth/me/photo", { photo });
  useAuthStore.getState().setSession(toAuthSession(useAuthStore.getState().token, user));
  return user;
}

export async function updateOrgPhoto(photo: string | null) {
  const organization = await patch<{ id: string; name: string; photo?: string | null }>("/org/photo", { photo });
  const state = useAuthStore.getState();
  if (state.org) {
    useAuthStore.setState({ org: { ...state.org, photo: organization.photo ?? null } });
  }
  return organization;
}

export async function fetchMe() {
  const revision = localeRevisionNow();
  const user = await get<AuthUserResponse>("/auth/me");
  useAuthStore.getState().setSession(toAuthSession(useAuthStore.getState().token, user));
  if (user.locale && revision === localeRevisionNow() && !localeSavePending()) {
    useLocaleStore.getState().setLocale(user.locale.toLowerCase().startsWith("en") ? "en" : "zh");
  }
  return user;
}

export function updateAccountLocale(locale: string) {
  return patch<{ locale: string }>("/auth/locale", { locale });
}

export async function restoreSession(): Promise<boolean> {
  try {
    await fetchMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    return Boolean(useAuthStore.getState().user);
  }
  const token = useAuthStore.getState().token;
  if (token) {
    try {
      await post<void>("/auth/session");
      useAuthStore.getState().clearToken();
    } catch {
      // A stored bearer still authorizes this page load.
    }
  }
  return Boolean(useAuthStore.getState().user);
}

export function requestPasswordReset(email: string) {
  return post<void>("/auth/forgot-password", { email, locale: useLocaleStore.getState().locale }, false);
}

export async function resetPassword(email: string, code: string, password: string) {
  return post<void>("/auth/reset-password", { email, code, password: await loginVerifier(password) }, false);
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return patch<void>("/auth/password", {
    current_password: await loginVerifier(currentPassword),
    new_password: await loginVerifier(newPassword),
  });
}

export function fetchMfa() {
  return get<MfaStatus>("/auth/mfa");
}

export function fetchNotices() {
  return get<NoticeSettings>("/auth/notices");
}

export function updateNotices(body: NoticeSettings) {
  return patch<NoticeSettings>("/auth/notices", body);
}

export function requestEmailMfa() {
  return post<void>("/auth/mfa/email/code", { locale: useLocaleStore.getState().locale });
}

export function enableEmailMfa(code: string) {
  return post<void>("/auth/mfa/email", { code });
}

export function disableEmailMfa() {
  return del("/auth/mfa/email");
}

export async function reauthenticate(password: string) {
  return post<void>("/auth/reauth", { password: await loginVerifier(password) });
}

export function requestReauthCode() {
  return post<void>("/auth/reauth/email/code", { locale: useLocaleStore.getState().locale });
}

export function reauthenticateWithCode(code: string) {
  return post<void>("/auth/reauth", { code });
}

export async function reauthenticateWithPasskey() {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const options = await post<PublicKeyCredentialRequestOptionsJSON>("/auth/reauth/passkey/options", {});
  const credential = await startAuthentication({ optionsJSON: options });
  return post<void>("/auth/reauth", { credential });
}

export async function confirmEmailChange(currentCode: string, nextCode: string) {
  const user = await post<AuthUserResponse>("/auth/email/confirm", {
    current_code: currentCode,
    next_code: nextCode,
  });
  useAuthStore.getState().setSession(toAuthSession(useAuthStore.getState().token, user));
  return user;
}

export async function registerPasskey() {
  const { startRegistration } = await import("@simplewebauthn/browser");
  const options = await post<PublicKeyCredentialCreationOptionsJSON>("/auth/passkeys/options", {});
  const credential = await startRegistration({ optionsJSON: options });
  return post<MfaStatus["passkeys"][number]>("/auth/passkeys", { credential });
}

export function deletePasskey(id: string) {
  return del(`/auth/passkeys/${id}`);
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

export function exportActivity() {
  return get<unknown[]>("/activity/export");
}

export async function fetchOrg() {
  return get<{
    organization: {
      id: string;
      name: string;
      plan?: string;
      kind?: string;
      photo?: string | null;
      entitlements?: Entitlements;
    };
    catalog: { resources: { id: string; actions: string[] }[]; roles: { id: string; permissions: AccessPermissions }[] };
    me: OrgMember | null;
  }>("/org");
}

export interface SubscriptionLine {
  kind: "plan" | string;
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

export interface OrgGroup {
  id: string;
  name: string;
  description: string;
  status: string;
  members: { employee_id: string }[];
}

export interface ApprovalPolicyRequirement {
  group_id: string;
  group_name: string;
  required_count: number;
}

export interface ApprovalPolicyRecord {
  id: string;
  name: string;
  status: string;
  required_count: number;
  group_id: string | null;
  requirements?: ApprovalPolicyRequirement[];
  allow_requester: boolean;
  expires_minutes: number | null;
  version: number;
}

export function approvalPolicySummary(policy: ApprovalPolicyRecord) {
  if (policy.requirements && policy.requirements.length > 0) {
    return policy.requirements
      .map((item) => `${item.group_name || item.group_id} ${item.required_count}`)
      .join(" + ");
  }
  return String(policy.required_count);
}

export function fetchGroups() {
  return get<OrgGroup[]>("/org/groups");
}

export function createGroup(body: { name: string; description?: string }) {
  return post<OrgGroup>("/org/groups", body);
}

export function addGroupMember(groupId: string, employeeId: string) {
  return post<OrgGroup>(`/org/groups/${groupId}/members`, { employee_id: employeeId });
}

export function removeGroupMember(groupId: string, employeeId: string) {
  return request<OrgGroup>(`/org/groups/${groupId}/members/${employeeId}`, { method: "DELETE" });
}

export function deleteGroup(groupId: string) {
  return del(`/org/groups/${groupId}`);
}

export function fetchApprovalPolicies() {
  return get<ApprovalPolicyRecord[]>("/org/approval-policies");
}

export function createApprovalPolicy(body: {
  name: string;
  required_count?: number;
  group_id?: string | null;
  requirements?: { group_id: string; required_count: number }[];
  allow_requester: boolean;
  expires_minutes?: number | null;
}) {
  return post<ApprovalPolicyRecord>("/org/approval-policies", body);
}

export function updateApprovalPolicy(
  id: string,
  body: {
    required_count?: number;
    requirements?: { group_id: string; required_count: number }[];
    allow_requester?: boolean;
  }
) {
  return patch<ApprovalPolicyRecord>(`/org/approval-policies/${id}`, body);
}

export async function acceptInvite(token: string, password: string) {
  const result = await post<LoginResponse>("/auth/accept-invite", { token, password: await loginVerifier(password) }, false);
  await establishSession(result);
  return result;
}

async function fetchAppMcp(): Promise<ApiAppMcp> {
  const empty: ApiAppMcp = { servers: [], attachments: {} };
  const token = useAuthStore.getState().token;
  if (!token) return empty;
  try {
    const response = await fetch(`${SATURN_AI_BASE}/app-mcp`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return empty;
    const body = (await response.json()) as ApiAppMcp;
    return {
      servers: Array.isArray(body.servers) ? body.servers : [],
      attachments: body.attachments && typeof body.attachments === "object" ? body.attachments : {},
    };
  } catch {
    return empty;
  }
}

export async function fetchConsole(): Promise<ConsoleData> {
  const [agents, tools, policies, approvals, activity, health, mcpServers, toolSets, appMcp] =
    await Promise.all([
      get<ApiAgent[]>("/agents"),
      get<ApiTool[]>("/tools"),
      get<ApiPolicy[]>("/policies"),
      get<ApiApproval[]>("/approvals"),
      get<ApiActivity[]>("/activity"),
      get<ApiHealth>("/health"),
      get<ApiMcpServer[]>("/mcp-servers").catch(() => []),
      get<ApiToolSet[]>("/tool-sets").catch(() => []),
      fetchAppMcp(),
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
  if (!response.ok) throw new ApiError(response.status, await apiErrorMessage(response));
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

export interface WebhookEndpointRecord {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  has_secret: boolean;
  created_at: string;
  updated_at: string;
  secret?: string;
}

export interface WebhookAttemptRecord {
  id: string;
  status_code: number | null;
  error: string;
  created_at: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  event_type: string;
  event_id: string;
  status: string;
  attempt_count: number;
  last_status_code: number | null;
  last_error: string;
  created_at: string;
  updated_at: string;
  attempts: WebhookAttemptRecord[];
}

export interface ApprovalWindowRecord {
  pending_ttl_minutes: number;
  resubmit_ttl_minutes: number;
}

export function fetchWebhooks() {
  return get<WebhookEndpointRecord[]>("/org/webhooks");
}

export function createWebhook(body: { url: string; events: string[] }) {
  return post<WebhookEndpointRecord>("/org/webhooks", body);
}

export function updateWebhook(id: string, body: { url?: string; events?: string[]; enabled?: boolean }) {
  return patch<WebhookEndpointRecord>(`/org/webhooks/${id}`, body);
}

export function rotateWebhookSecret(id: string) {
  return post<{ secret: string }>(`/org/webhooks/${id}/rotate`);
}

export async function downloadWebhookSecret(id: string) {
  const headers = new Headers();
  const token = useAuthStore.getState().token;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}/org/webhooks/${id}/secret`, {
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new ApiError(response.status, await apiErrorMessage(response));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `saturn-webhook-${id}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function testWebhook(id: string) {
  return post<WebhookDeliveryRecord>(`/org/webhooks/${id}/test`);
}

export function fetchWebhookDeliveries(id: string) {
  return get<WebhookDeliveryRecord[]>(`/org/webhooks/${id}/deliveries`);
}

export function retryWebhookDelivery(id: string) {
  return post<WebhookDeliveryRecord>(`/org/webhooks/deliveries/${id}/retry`);
}

export function fetchApprovalWindow() {
  return get<ApprovalWindowRecord>("/org/approval-window");
}

export function updateApprovalWindow(body: ApprovalWindowRecord) {
  return patch<ApprovalWindowRecord>("/org/approval-window", body);
}
