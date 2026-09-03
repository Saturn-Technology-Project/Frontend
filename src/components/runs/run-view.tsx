"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ApprovalPanel } from "@/components/approvals/approval-panel";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole, useResolveApproval } from "@/hooks/use-console";
import { agentCopy, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatUsdc, relativeTime, shortAddress } from "@/lib/format";
import { formatMoney, normalizeDecision } from "@/lib/policy";
import type { AgentRun, PaymentStatus, PolicyEvaluation, RunStatus } from "@/types";

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

function decisionStamp(decision: string | null) {
  if (!decision) return null;
  const key = normalizeDecision(decision);
  if (key === "allow") return "ALLOW";
  if (key === "deny") return "DENY";
  return "APPROVAL REQUIRED";
}

function Connector() {
  return <div className="py-3 pl-1 text-[13px] text-muted-foreground">↓</div>;
}

function argumentLines(args: Record<string, unknown>) {
  return Object.entries(args).map(([key, value]) => {
    const label = key.replaceAll("_", " ");
    const rendered =
      key === "amount" ? formatMoney(value) : typeof value === "string" ? value : JSON.stringify(value);
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${rendered}`;
  });
}

function EvaluationBlock({
  item,
  index,
  locale,
}: {
  item: PolicyEvaluation;
  index: number;
  locale: "en" | "zh";
}) {
  const { t } = useI18n();
  const stamp = decisionStamp(item.decision);
  const executed = item.status === "completed";
  const denied = item.status === "denied" || item.status === "rejected";
  const waiting = item.status === "waiting_approval";

  return (
    <div>
      <SectionLabel>{t("run.actionN", { n: String(index + 1).padStart(2, "0") })}</SectionLabel>
      <div className="mt-3 border-t border-border pt-4">
        <div className="text-[15px]">{item.tool}</div>
        <div className="mt-2 space-y-1 text-[13px] text-muted-foreground">
          {argumentLines(item.arguments).map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>

        {item.decision ? (
          <>
            <Connector />
            <SectionLabel>{t("run.policyEvaluation")}</SectionLabel>
            <div className="mt-3">
              {item.policyName ? (
                <StatusLabel tone="active">
                  {item.policyName}
                  {item.policyVersion ? ` ${t("policies.version", { n: item.policyVersion })}` : ""}
                </StatusLabel>
              ) : null}
              {item.matchedRule ? (
                <div className="mt-4">
                  <div className="text-[12px] text-muted-foreground">{t("run.ruleMatched")}</div>
                  <div className="mt-2 whitespace-pre-line text-[15px] leading-7">
                    {item.matchedRule.replaceAll(" AND ", "\nAND\n")}
                  </div>
                </div>
              ) : null}
              <div className="mt-5">
                <div className="text-[12px] text-muted-foreground">{t("run.decision")}</div>
                <div
                  className={cn(
                    "mt-2 text-[13px] tracking-[0.08em]",
                    normalizeDecision(item.decision) === "allow"
                      ? "text-success"
                      : normalizeDecision(item.decision) === "deny"
                        ? "text-destructive"
                        : "text-warning"
                  )}
                >
                  {stamp}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {item.approvalId ? (
          <>
            <Connector />
            <SectionLabel>{t("run.humanApproval")}</SectionLabel>
            <div className="mt-3 text-[15px]">
              {item.approvalStatus === "approved" && item.resolvedBy ? (
                <>
                  <div>{t("approvals.approvedBy", { name: item.resolvedBy })}</div>
                  {item.resolvedAt ? (
                    <div className="mt-1 text-[13px] text-muted-foreground">
                      {relativeTime(item.resolvedAt, locale)}
                    </div>
                  ) : null}
                </>
              ) : item.approvalStatus === "rejected" && item.resolvedBy ? (
                <>
                  <div>{t("approvals.rejectedBy", { name: item.resolvedBy })}</div>
                  {item.resolvedAt ? (
                    <div className="mt-1 text-[13px] text-muted-foreground">
                      {relativeTime(item.resolvedAt, locale)}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-warning">{t("run.status.awaiting_approval")}</div>
              )}
            </div>
          </>
        ) : null}

        <Connector />
        <SectionLabel>{t("run.toolExecution")}</SectionLabel>
        <div className="mt-3 flex items-center gap-2.5 text-[15px]">
          {executed ? <Check className="size-3.5 text-success" /> : null}
          <span>{item.tool}</span>
        </div>
        <div className="mt-2 text-[13px] tracking-[0.08em] text-muted-foreground">
          {executed
            ? t("run.completed")
            : denied
              ? t("run.denied")
              : waiting
                ? t("run.waiting")
                : t("run.status.running")}
        </div>
      </div>
    </div>
  );
}

export function RunView({ run }: { run: AgentRun }) {
  const { t, locale } = useI18n();
  const { data } = useConsole();
  const resolveApproval = useResolveApproval();
  const agent = data?.agents.find((item) => item.id === run.agentId);
  const copy = agent ? agentCopy(locale, agent.id, agent) : null;
  const approval = data?.approvals.find((item) => item.id === run.approvalId);
  const payments = (data?.payments ?? []).filter((item) => item.runId === run.id);
  const [approvalOpen, setApprovalOpen] = useState(run.status === "awaiting_approval");

  return (
    <div className="mx-auto w-full max-w-[680px] px-8 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] text-muted-foreground">{t("agents.role")}</div>
          <h1 className="mt-1 text-[22px] font-medium tracking-tight">
            {copy?.name ?? agent?.name ?? t("run.agent")}
          </h1>
          <div className="mt-1 font-mono text-[12px] text-muted-foreground">
            {run.id.replace(/^run_/, "Run ")}
          </div>
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

      <div className="mt-10 space-y-10">
        {run.evaluations.map((item, index) => (
          <EvaluationBlock key={item.id} item={item} index={index} locale={locale} />
        ))}
      </div>

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

      <div className="mt-10 flex items-center gap-3">
        {run.status === "awaiting_approval" ? (
          <Button onClick={() => setApprovalOpen(true)}>{t("run.reviewApproval")}</Button>
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
