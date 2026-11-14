import { useAuthStore } from "@/lib/auth";
import { del, get, patch, post, request } from "./transport";
import type { AccessPermissions, Entitlements } from "./types";

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
      photo?: string | null;
      entitlements?: Entitlements;
    };
    catalog: { resources: { id: string; actions: string[] }[]; roles: { id: string; permissions: AccessPermissions }[] };
    me: OrgMember | null;
  }>("/org");
}

export async function updateOrgPhoto(photo: string | null) {
  const organization = await patch<{ id: string; name: string; photo?: string | null }>("/org/photo", { photo });
  const state = useAuthStore.getState();
  if (state.org) {
    useAuthStore.setState({ org: { ...state.org, photo: organization.photo ?? null } });
  }
  return organization;
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

export interface ApprovalWindowRecord {
  pending_ttl_minutes: number;
  resubmit_ttl_minutes: number;
}

export function fetchApprovalWindow() {
  return get<ApprovalWindowRecord>("/org/approval-window");
}

export function updateApprovalWindow(body: ApprovalWindowRecord) {
  return patch<ApprovalWindowRecord>("/org/approval-window", body);
}
