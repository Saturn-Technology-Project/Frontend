import type { Approval } from "@/types";

export function showApproval(approval: Approval) {
  if (approval.status === "pending" || approval.status === "expired") return true;
  return approval.status === "approved" && (approval.executionState ?? "none") === "none";
}

export function approvalStatusKey(approval: Approval) {
  if (approval.status === "pending") return "approvals.pending";
  if (approval.status === "approved" && (approval.executionState ?? "none") === "none") {
    return "approvals.awaitingResubmit";
  }
  if (approval.status === "expired" && approval.expiredPhase === "resubmit") return "approvals.expiredResubmit";
  if (approval.status === "expired") return "approvals.expiredPending";
  if (approval.status === "rejected") return "approvals.rejected";
  if (approval.status === "approved") return "approvals.approved";
  return "approvals.pending";
}

export function approvalDeadline(approval: Approval) {
  if (approval.status === "approved" || approval.expiredPhase === "resubmit") return approval.resubmitExpiresAt;
  return approval.expiresAt;
}

export function remainingParts(iso: string | undefined, now = Date.now()): { key: string; count?: number } | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return { key: "approvals.remainingNone" };
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  if (minutes < 60) return { key: "approvals.remainingMinutes", count: minutes };
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return { key: "approvals.remainingHours", count: hours };
  return { key: "approvals.remainingDays", count: Math.ceil(hours / 24) };
}
