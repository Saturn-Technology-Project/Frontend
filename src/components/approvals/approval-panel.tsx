"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionLabel } from "@/components/ui/section-label";
import { useConsole } from "@/hooks/use-console";
import { approvalDeadline, approvalStatusKey, remainingParts } from "@/lib/approval-deadline";
import { useAuthStore } from "@/lib/auth";
import { openSealedActivity } from "@/lib/payload-crypto";
import { agentCopy, useI18n } from "@/lib/i18n";
import type { Approval } from "@/types";

function deadlineText(
  iso: string,
  locale: "en" | "zh",
  t: (path: string, vars?: Record<string, string | number>) => string
) {
  const remaining = remainingParts(iso);
  const when = new Date(iso).toLocaleString(locale === "zh" ? "zh-TW" : "en-US");
  if (!remaining) return when;
  return `${when} · ${t("approvals.remaining")} ${t(remaining.key, { count: remaining.count ?? 0 })}`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[112px_1fr] sm:gap-4">
      <SectionLabel className="pt-0.5">{label}</SectionLabel>
      <div className="text-[15px] leading-6 text-foreground">{value}</div>
    </div>
  );
}

export function ApprovalPanel({
  approval,
  open,
  onOpenChange,
  onResolve,
  resolving = false,
}: {
  approval: Approval | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (decision: "approved" | "rejected") => void;
  resolving?: boolean;
}) {
  const { t, locale } = useI18n();
  const orgId = useAuthStore((state) => state.org?.id) ?? "";
  const [opened, setOpened] = useState<Record<string, unknown> | null>(null);
  const [revealFailed, setRevealFailed] = useState(false);
  const shown = opened ?? approval?.arguments;
  const { data } = useConsole();
  if (!approval) return null;

  const pending = approval.status === "pending";
  const agent = data?.agents.find((item) => item.id === approval.agentId);
  const agentName = agent ? agentCopy(locale, agent.id, agent).name : approval.agentId;
  const riskKey =
    approval.risk === "high"
      ? "approvals.riskHigh"
      : approval.risk === "low"
        ? "approvals.riskLow"
        : "approvals.riskMedium";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(420px,calc(100%-2rem))] max-w-none gap-0 rounded-md p-0 ring-border sm:max-w-none"
      >
        <div className="border-b border-border px-6 py-5">
          <DialogTitle className="saturn-label">{t("approvals.request")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("approvals.reviewAria")}
          </DialogDescription>
        </div>

        <div className="divide-y divide-border px-6">
          <Field label={t("approvals.agent")} value={agentName} />
          <Field label={t("approvals.action")} value={approval.action} />
          {shown && Object.keys(shown).length > 0 ? (
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[112px_1fr] sm:gap-4">
              <SectionLabel className="pt-0.5">{t("approvals.arguments")}</SectionLabel>
              <dl className="min-w-0 space-y-1 font-mono text-[12px] leading-5">
                {Object.entries(shown).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="shrink-0 text-muted-foreground">{key}</dt>
                    <dd className="min-w-0 whitespace-pre-wrap break-words">
                      {typeof value === "string" ? value : JSON.stringify(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          {approval.sealed && approval.activityEventId && !opened ? (
            <div className="py-3">
              <button
                type="button"
                className="text-[13px] text-muted-foreground underline hover:text-foreground"
                onClick={() => {
                  void openSealedActivity(approval.activityEventId!, orgId)
                    .then((content) => {
                      const args = content.arguments;
                      setOpened(args && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : content);
                      setRevealFailed(false);
                    })
                    .catch(() => setRevealFailed(true));
                }}
              >
                {t("activity.reveal")}
              </button>
              {revealFailed ? <p className="mt-1 text-[13px] text-destructive">{t("activity.revealFailed")}</p> : null}
            </div>
          ) : null}
          {approval.customer ? (
            <Field label={t("approvals.customer")} value={approval.customer} />
          ) : null}
          {approval.amount ? (
            <Field
              label={t("approvals.amount")}
              value={`${approval.amount} ${approval.currency ?? ""}`.trim()}
            />
          ) : null}
          {approval.reason ? (
            <Field label={t("approvals.reason")} value={approval.reason} />
          ) : null}
          {approval.policy ? (
            <Field
              label={t("approvals.policy")}
              value={`${approval.policy}${approval.policyVersion ? ` v${approval.policyVersion}` : ""}`}
            />
          ) : null}
          {approval.triggeredRule ? (
            <Field label={t("approvals.triggeredRule")} value={approval.triggeredRule} />
          ) : null}
          {approval.risk ? <Field label={t("approvals.risk")} value={t(riskKey)} /> : null}
          {(approval.requirements?.length ?? 0) > 1 ? (
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[112px_1fr] sm:gap-4">
              <SectionLabel className="pt-0.5">{t("approvals.progress")}</SectionLabel>
              <div className="space-y-1 text-[15px] leading-6 text-foreground">
                {approval.requirements?.map((item) => (
                  <div key={item.groupId}>
                    {t("approvals.groupProgress", {
                      name: item.groupName || item.groupId,
                      approved: item.approvedCount,
                      required: item.requiredCount,
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (approval.requiredCount ?? 1) > 1 ? (
            <Field
              label={t("approvals.progress")}
              value={t("approvals.progressValue", {
                approved: approval.approvedCount ?? 0,
                required: approval.requiredCount ?? 0,
              })}
            />
          ) : null}
          <Field label={t("approvals.status")} value={t(approvalStatusKey(approval))} />
          <p className="py-3 text-[13px] leading-5 text-muted-foreground">{t("approvals.notExecuted")}</p>
          {approvalDeadline(approval) ? (
            <Field
              label={t("approvals.deadline")}
              value={deadlineText(approvalDeadline(approval)!, locale, t)}
            />
          ) : null}
          {approval.resolvedAt && approval.status !== "pending" ? (
            <Field
              label={t("approvals.approvedAt")}
              value={new Date(approval.resolvedAt).toLocaleString(locale === "zh" ? "zh-TW" : "en-US")}
            />
          ) : null}
          {approval.executionState && approval.executionState !== "none" ? (
            <Field
              label={t("approvals.execution")}
              value={t(
                approval.executionState === "executed"
                  ? "approvals.executionExecuted"
                  : approval.executionState === "failed"
                    ? "approvals.executionFailed"
                    : approval.executionState === "uncertain"
                      ? "approvals.executionUncertain"
                      : approval.executionState === "claimed"
                        ? "approvals.executionClaimed"
                        : "approvals.executionNone"
              )}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          {pending ? (
            <>
              <Button
                variant="outline"
                disabled={resolving}
                onClick={() => onResolve("rejected")}
              >
                {t("approvals.reject")}
              </Button>
              <Button disabled={resolving} onClick={() => onResolve("approved")}>
                {t("approvals.approve")}
              </Button>
            </>
          ) : (
            <div className="text-[12px] text-muted-foreground">
              {t(
                approval.status === "approved"
                  ? "approvals.approvedBy"
                  : "approvals.rejectedBy",
                { name: approval.resolvedBy ?? "" }
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
