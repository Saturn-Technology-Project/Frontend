import type { ApiAgentSettings } from "@/lib/agent-config";

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
  mfa_setup_required?: boolean;
}

export interface LoginResponse {
  // Browsers get the session only as an HttpOnly cookie; the API omits the token for them.
  token?: string | null;
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
