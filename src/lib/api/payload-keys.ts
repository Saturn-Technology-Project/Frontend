import { get, post } from "./transport";

export type RecoveryBackup = {
  v: number;
  kdf: string;
  /** v2 (PBKDF2-HMAC-SHA256) only. */
  iterations?: number;
  legacy?: boolean;
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
  /** Legacy envelopes only. New ones carry content_mac (keyed by the DEK) and key_check. */
  content_sha256?: string;
  content_mac?: string;
  key_check?: string;
};

export type PayloadKeyStatus = {
  active_version: number | null;
  encryption_status: string;
  public_key: string | null;
  historical_note: string;
  own_member_key_id?: string | null;
  own_member_key_approval?: string | null;
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

/** A member key backup. v2 ("CLIENT-SECRET") is wrapped in the browser and opaque to the server. */
export type PasswordBackup =
  | { v: 2; kdf: "CLIENT-SECRET"; scheme: string; blob: string }
  | { v: number; kdf: string; iterations: number; salt: string; nonce: string; ciphertext: string };

export type MemberBackup = PasswordBackup & {
  member_key_id: string;
  public_key: string;
  approval?: string;
  legacy?: boolean;
};

export function fetchPayloadBackup() {
  return get<RecoveryBackup>("/org/payload-keys/backup");
}

export function fetchMemberBackup() {
  return get<MemberBackup>("/org/payload-keys/member/backup");
}

export function registerMemberPayloadKey(body: { public_key: string; backup: PasswordBackup; needs_assist?: boolean }) {
  return post<{ id: string; public_key: string; approval?: string; fingerprint?: string }>("/org/payload-keys/member", body);
}

export type PendingMemberKey = {
  member_key_id: string;
  user_id: string;
  name: string;
  email: string;
  fingerprint: string;
  public_key: string;
  created_at: string | null;
  approval: string;
};

/** Team admins only. A new member key gets no payload keys until an admin approves it. */
export function fetchPendingMemberKeys() {
  return get<{ keys: PendingMemberKey[] }>("/org/payload-keys/members/pending");
}

export function approveMemberKey(memberKeyId: string) {
  return post<{ id: string; user_id: string; approval: string }>(`/org/payload-keys/member/${encodeURIComponent(memberKeyId)}/approve`);
}

export function rejectMemberKey(memberKeyId: string) {
  return post<{ id: string; user_id: string; approval: string }>(`/org/payload-keys/member/${encodeURIComponent(memberKeyId)}/reject`);
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
  content_sha256?: string | null;
  /** True when the envelope has a key_check: the grant must prove possession of the DEK. */
  proof_required?: boolean;
  org_key_version: number;
  wrapped_dek: string;
  own_wrap: string;
};

export function fetchMemberRewrap(memberKeyId: string, cursor?: string | null) {
  const query = new URLSearchParams({ member_key_id: memberKeyId });
  if (cursor) query.set("cursor", cursor);
  return get<{ records: RewrapSource[]; next_cursor?: string | null }>(`/org/payload-keys/member/rewrap?${query.toString()}`);
}

export function submitMemberRewrap(body: {
  member_key_id: string;
  records: { id: string; type: string; wrapped_dek: string; content_sha256?: string; dek_proof?: string }[];
}) {
  return post<{ migrated: number }>("/org/payload-keys/member/rewrap", body);
}
