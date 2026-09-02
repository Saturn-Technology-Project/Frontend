"use client";

import { useState } from "react";
import Link from "next/link";
import { ApprovalPanel } from "@/components/approvals/approval-panel";
import { QueryGate } from "@/components/layout/query-gate";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole, useResolveApproval } from "@/hooks/use-console";
import { relativeTime } from "@/lib/format";
import { agentCopy, useI18n } from "@/lib/i18n";
import type { Approval } from "@/types";

export default function ApprovalsPage() {
  const { t } = useI18n();
  const { data, isPending, isError } = useConsole();
  const resolveApproval = useResolveApproval();
  const approvals = data?.approvals ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = approvals.find((item) => item.id === activeId) ?? null;

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">
          {t("approvals.title")}
        </h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t("approvals.subtitle")}
        </p>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {approvals.length === 0 ? (
            <li className="py-4 text-[13px] text-muted-foreground">
              {t("approvals.empty")}
            </li>
          ) : (
            approvals.map((approval) => (
              <ApprovalRow
                key={approval.id}
                approval={approval}
                onOpen={() => setActiveId(approval.id)}
              />
            ))
          )}
        </ul>
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

function ApprovalRow({
  approval,
  onOpen,
}: {
  approval: Approval;
  onOpen: () => void;
}) {
  const { t, locale } = useI18n();
  const { data } = useConsole();
  const agent = data?.agents.find((item) => item.id === approval.agentId);
  const name = agent
    ? agentCopy(locale, agent.id, agent).name
    : approval.agentId;
  const statusLabel =
    approval.status === "pending"
      ? t("approvals.required")
      : approval.status === "approved"
        ? t("approvals.approved")
        : t("approvals.rejected");

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="grid w-full grid-cols-[180px_1fr_140px_120px] items-center gap-4 py-4 text-left hover:bg-muted/40"
      >
        <span className="text-[13px] font-medium">{name}</span>
        <span className="text-[13px]">
          {approval.action}
          {approval.amount ? ` ${approval.amount}` : ""}
          {approval.customer ? ` · ${approval.customer}` : ""}
        </span>
        <span className="text-[12px] text-muted-foreground">
          {relativeTime(approval.requestedAt, locale)}
        </span>
        <StatusLabel
          tone={
            approval.status === "pending"
              ? "pending"
              : approval.status === "approved"
                ? "completed"
                : "rejected"
          }
          className="justify-self-end"
        >
          {statusLabel}
        </StatusLabel>
      </button>
      <div className="pb-3">
        <Link
          href={`/agents/${approval.agentId}/runs/${approval.runId}`}
          className="text-[12px] text-muted-foreground hover:text-foreground"
        >
          {t("approvals.openRun")}
        </Link>
      </div>
    </li>
  );
}
