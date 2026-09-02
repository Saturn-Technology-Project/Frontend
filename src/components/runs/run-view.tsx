"use client";

import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApprovalPanel } from "@/components/approvals/approval-panel";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusDot, StatusLabel } from "@/components/ui/status-dot";
import { useConsole, useResolveApproval } from "@/hooks/use-console";
import { agentCopy, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatUsdc, shortAddress } from "@/lib/format";
import type { AgentRun, PaymentStatus, RunStatus } from "@/types";

const statusTone: Record<
  RunStatus,
  "running" | "pending" | "completed" | "rejected" | "executing" | "failed"
> = {
  running: "running",
  awaiting_execution: "running",
  awaiting_approval: "pending",
  executing: "executing",
  completed: "completed",
  failed: "failed",
  rejected: "rejected",
};

const paymentTone: Record<PaymentStatus, "pending" | "completed" | "rejected" | "failed"> = {
  pending: "pending",
  verified: "pending",
  settled: "completed",
  denied: "rejected",
  failed: "failed",
};

export function RunView({ run }: { run: AgentRun }) {
  const { t, locale } = useI18n();
  const { data } = useConsole();
  const resolveApproval = useResolveApproval();
  const agent = data?.agents.find((item) => item.id === run.agentId);
  const copy = agent ? agentCopy(locale, agent.id, agent) : null;
  const approval = data?.approvals.find((item) => item.id === run.approvalId);
  const payments = (data?.payments ?? []).filter((item) => item.runId === run.id);
  const [approvalOpen, setApprovalOpen] = useState(
    run.status === "awaiting_approval"
  );
  const [openStep, setOpenStep] = useState<string | null>(null);

  const showActions =
    run.actions.length > 0 &&
    (run.status === "awaiting_approval" ||
      run.status === "completed" ||
      run.status === "failed" ||
      run.status === "rejected");

  return (
    <div className="mx-auto w-full max-w-[680px] px-8 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] text-muted-foreground">
            {t("agents.role")}
          </div>
          <h1 className="mt-1 text-[22px] font-medium tracking-tight">
            {copy?.name ?? agent?.name ?? t("run.agent")}
          </h1>
        </div>
        <StatusLabel
          tone={statusTone[run.status]}
          className="pt-2 uppercase tracking-[0.06em]"
        >
          {t(`run.status.${run.status}`)}
        </StatusLabel>
      </div>

      <section className="mt-10">
        <SectionLabel>{t("run.userRequest")}</SectionLabel>
        <div className="mt-3 border-t border-border pt-4 text-[15px] leading-7 text-foreground">
          {run.prompt}
        </div>
      </section>

      <section className="mt-10">
        <SectionLabel>{t("run.agent")}</SectionLabel>
        <div className="mt-3 border-t border-border pt-4 text-[15px] leading-7 text-foreground">
          {run.thought}
        </div>

        <ul className="mt-5 space-y-2">
          {run.steps.map((step) => {
            const done = step.status === "completed";
            const expanded = openStep === step.id;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => setOpenStep(expanded ? null : step.id)}
                  className="flex w-full items-center gap-2.5 py-1 text-left text-[13px]"
                >
                  {done ? (
                    <Check className="size-3.5 text-success" />
                  ) : (
                    <Circle className="size-3.5 text-[#d0d0ca]" />
                  )}
                  <span className={done ? "text-foreground" : "text-muted-foreground"}>
                    {step.label}
                  </span>
                </button>
                {expanded && (done || step.parameters) ? (
                  <div className="mb-2 ml-6 grid gap-2 rounded-md border border-border bg-card px-3 py-3 font-mono text-[11px] leading-5 text-muted-foreground">
                    {step.tool ? <div>TOOL  {step.tool}</div> : null}
                    {step.parameters ? (
                      <div>PARAMS  {JSON.stringify(step.parameters)}</div>
                    ) : null}
                    {step.result ? (
                      <div>RESULT  {JSON.stringify(step.result)}</div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {run.finding && showActions ? (
        <p className="mt-8 text-[14px] leading-6 text-muted-foreground">
          {run.finding}
        </p>
      ) : null}

      {showActions ? (
        <section className="mt-10">
          <SectionLabel>{t("run.actionProposed")}</SectionLabel>
          <div className="mt-3 border-t border-border pt-4">
            <ul className="space-y-2 text-[15px] leading-7">
              {run.actions.map((action) => (
                <li
                  key={action.id}
                  className="flex items-center justify-between gap-4"
                >
                  <span>{action.label}</span>
                  {action.requiresApproval ? (
                    <span className="text-[11px] text-warning">
                      {t("run.approval")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {run.policyChecks.length > 0 ? (
        <section className="mt-10">
          <SectionLabel>{t("run.policyCheck")}</SectionLabel>
          <div className="mt-3 space-y-2 border-t border-border pt-4">
            {run.policyChecks.map((check) => (
              <div key={check.id} className="flex items-center gap-2.5 text-[13px]">
                <StatusDot
                  tone={
                    check.status === "pass"
                      ? "pass"
                      : check.status === "fail"
                        ? "failed"
                        : "approval"
                  }
                />
                <span>{check.name}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {payments.length > 0 ? (
        <section className="mt-10">
          <SectionLabel>{t("run.x402")}</SectionLabel>
          <ul className="mt-3 divide-y divide-border border-t border-border pt-0 text-[13px]">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-4 border-b border-border py-3"
              >
                <div className="min-w-0">
                  <div className="font-mono">{payment.tool}</div>
                  {payment.txHash ? (
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {shortAddress(payment.txHash)}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[12px]">
                    {formatUsdc(payment.amount, payment.asset)}
                  </span>
                  <StatusLabel tone={paymentTone[payment.status]}>
                    {t(`wallets.${payment.status === "verified" ? "pending" : payment.status}`)}
                  </StatusLabel>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {run.executionNotes?.length ? (
        <ul className="mt-10 space-y-2">
          {run.executionNotes.map((note) => (
            <li key={note} className="flex items-center gap-2.5 text-[13px]">
              <Check className="size-3.5 text-success" />
              {note}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-10 flex items-center gap-3">
        {run.status === "awaiting_approval" ? (
          <Button onClick={() => setApprovalOpen(true)}>
            {t("run.reviewApproval")}
          </Button>
        ) : null}
        {run.status === "completed" || run.status === "failed" || run.status === "rejected" ? (
          <Link
            href="/activity"
            className={cn(
              "inline-flex h-8 items-center rounded-md border border-border px-2.5 text-sm hover:bg-muted"
            )}
          >
            {t("run.viewAudit")}
          </Link>
        ) : null}
      </div>

      <ApprovalPanel
        approval={approval ?? null}
        open={approvalOpen && Boolean(approval)}
        onOpenChange={setApprovalOpen}
        resolving={resolveApproval.isPending}
        onResolve={(decision) => {
          if (!run.approvalId) return;
          resolveApproval.mutate(
            { id: run.approvalId, decision },
            { onSuccess: () => setApprovalOpen(false) }
          );
        }}
      />
    </div>
  );
}
