"use client";

import { useState } from "react";
import Link from "next/link";
import { ApprovalPanel } from "@/components/approvals/approval-panel";
import { QueryGate } from "@/components/layout/query-gate";
import { Button } from "@/components/ui/button";
import { useConsole, useResolveApproval } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { approvalDeadline, approvalStatusKey, isResubmitTask, remainingParts, showApproval } from "@/lib/approval-deadline";
import { relativeTime } from "@/lib/format";
import { agentCopy, useI18n } from "@/lib/i18n";
import type { Approval } from "@/types";

export default function ApprovalsPage() {
  return <ApprovalsScreen mode="approve" />;
}

export function ApprovalsScreen({ mode }: { mode: "approve" | "resubmit" }) {
  const { t } = useI18n();
  const { data, isPending, isError } = useConsole();
  const resolveApproval = useResolveApproval();
  const approvals = (data?.approvals ?? [])
    .filter(mode === "resubmit" ? isResubmitTask : showApproval)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = approvals.find((item) => item.id === activeId) ?? null;
  const canWrite = canAccess(
    useAuthStore((state) => state.user?.permissions),
    "approvals",
    "write"
  );

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-4 py-5 md:px-8 md:py-6">
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">
          {t(mode === "resubmit" ? "approvals.resubmitTitle" : "approvals.title")}
        </h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t(mode === "resubmit" ? "approvals.resubmitSubtitle" : "approvals.subtitle")}
        </p>
        {approvals.length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">
            {t(mode === "resubmit" ? "approvals.resubmitEmpty" : "approvals.empty")}
          </p>
        ) : (
          <ul className="mt-8 max-w-[640px] space-y-3">
            {approvals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                canWrite={canWrite}
                resolving={resolveApproval.isPending && activeId === approval.id}
                onOpen={() => setActiveId(approval.id)}
                onResolve={(decision) => {
                  resolveApproval.mutate({ id: approval.id, decision });
                }}
              />
            ))}
          </ul>
        )}
        <ApprovalPanel
          approval={active}
          open={Boolean(active)}
          resolving={resolveApproval.isPending}
          onOpenChange={(open) => {
            if (!open) setActiveId(null);
          }}
          onResolve={(decision) => {
            if (!active) return;
            resolveApproval.mutate(
              { id: active.id, decision },
              { onSuccess: () => setActiveId(null) }
            );
          }}
        />
      </div>
    </QueryGate>
  );
}

function ApprovalTiming({ approval }: { approval: Approval }) {
  const { t, locale } = useI18n();
  const deadline = approvalDeadline(approval);
  const remaining = remainingParts(deadline);
  const when = deadline
    ? new Date(deadline).toLocaleString(locale === "zh" ? "zh-TW" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return (
    <div className="mt-3 text-[13px] text-muted-foreground">
      <div>{t(approvalStatusKey(approval))}</div>
      {approval.resolvedAt && approval.status !== "pending" ? (
        <div>
          {t("approvals.approvedAt")}{" "}
          {new Date(approval.resolvedAt).toLocaleString(locale === "zh" ? "zh-TW" : "en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      ) : null}
      {when ? (
        <div>
          {t("approvals.deadline")} {when}
          {remaining ? ` · ${t("approvals.remaining")} ${t(remaining.key, { count: remaining.count ?? 0 })}` : ""}
        </div>
      ) : null}
      <div>{t("approvals.notExecuted")}</div>
    </div>
  );
}

function ApprovalCard({
  approval,
  canWrite,
  resolving,
  onOpen,
  onResolve,
}: {
  approval: Approval;
  canWrite: boolean;
  resolving: boolean;
  onOpen: () => void;
  onResolve: (decision: "approved" | "rejected") => void;
}) {
  const { t, locale } = useI18n();
  const { data } = useConsole();
  const agent = data?.agents.find((item) => item.id === approval.agentId);
  const name = agent ? agentCopy(locale, agent.id, agent).name : approval.agentId;
  const pending = approval.status === "pending";

  return (
    <li className="border border-border">
      <button type="button" onClick={onOpen} className="w-full px-5 py-5 text-left">
        <div className="text-[15px] font-medium">{approval.action}</div>
        <div className="mt-1 text-[13px] text-muted-foreground">
          {name} · {relativeTime(approval.requestedAt, locale)}
        </div>
        {approval.amount ? (
          <div className="text-[13px] text-muted-foreground">
            {t("approvals.amount")}: {approval.amount}
            {approval.currency ? ` ${approval.currency}` : ""}
          </div>
        ) : null}
        {approval.policy ? (
          <div className="mt-4 text-[13px]">
            {t("approvals.policy")}: {approval.policy}
            {approval.policyVersion ? ` v${approval.policyVersion}` : ""}
          </div>
        ) : null}
        {approval.reason ? (
          <div className="mt-1 text-[13px] text-muted-foreground">
            {t("approvals.reason")}: {approval.reason}
          </div>
        ) : null}
        <ApprovalTiming approval={approval} />
      </button>
      <div className="flex items-center justify-between px-5 pb-4">
        <Link
          href={`/activity?event=${approval.runId}`}
          className="text-[12px] text-muted-foreground hover:text-foreground"
        >
          {t("approvals.openRun")}
        </Link>
        {pending && canWrite ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={resolving}
              onClick={(event) => {
                event.preventDefault();
                onResolve("rejected");
              }}
            >
              {t("approvals.reject")}
            </Button>
            <Button
              disabled={resolving}
              onClick={(event) => {
                event.preventDefault();
                onResolve("approved");
              }}
            >
              {t("approvals.approve")}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
