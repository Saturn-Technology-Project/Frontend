"use client";

import { useState } from "react";
import Link from "next/link";
import { ApprovalPanel } from "@/components/approvals/approval-panel";
import { QueryGate } from "@/components/layout/query-gate";
import { Button } from "@/components/ui/button";
import { useConsole, useResolveApproval } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { agentCopy, useI18n } from "@/lib/i18n";
import type { Approval } from "@/types";

export default function ApprovalsPage() {
  const { t } = useI18n();
  const { data, isPending, isError } = useConsole();
  const resolveApproval = useResolveApproval();
  const approvals = data?.approvals ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = approvals.find((item) => item.id === activeId) ?? null;
  const canWrite = canAccess(
    useAuthStore((state) => state.user?.permissions),
    "approvals",
    "write"
  );

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("approvals.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t("approvals.subtitle")}
        </p>
        {approvals.length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("approvals.empty")}</p>
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
        <div className="mt-1 text-[13px] text-muted-foreground">{name}</div>
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
      </button>
      <div className="flex items-center justify-between px-5 pb-4">
        <Link
          href={`/agents/${approval.agentId}/runs/${approval.runId}`}
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
