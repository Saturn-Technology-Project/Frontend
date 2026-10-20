"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { PolicyRuleDisplay } from "@/components/policies/policy-rule-display";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { consoleQueryKey } from "@/hooks/use-console";
import { ApiError, activatePolicy, validatePolicy } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import type { Policy, PolicyStatus } from "@/types";

export function PolicyView({ policy }: { policy: Policy }) {
  const { t } = useI18n();
  const canWrite = canAccess(
    useAuthStore((state) => state.user?.permissions),
    "policies",
    "write"
  );
  const client = useQueryClient();
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [confirmDetail, setConfirmDetail] = useState("");

  // Policies start as drafts. Publishing validates first, then activates; any allow needs an explicit confirm.
  async function publish(confirm: boolean) {
    setPublishing(true);
    setPublishError("");
    try {
      const result = await validatePolicy(policy.id);
      if (!result.report.ok) {
        setPublishError(t("policies.publishInvalid"));
        return;
      }
      await activatePolicy(policy.id, confirm);
      setConfirmDetail("");
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409 && !confirm) {
        setConfirmDetail(caught.message);
      } else {
        setPublishError(caught instanceof ApiError ? caught.message : t("common.requestFailed"));
      }
    } finally {
      setPublishing(false);
    }
  }
  const agents = policy.agents.length > 0 ? policy.agents : [t("policies.allAgents")];
  const tools = policy.tools.length > 0 ? policy.tools : ["—"];

  return (
    <div className="mx-auto w-full max-w-[680px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div>
          <div className="text-[11px] text-muted-foreground">{t("policies.role")}</div>
          <h1 className="mt-1 text-[22px] font-medium tracking-tight">{policy.name}</h1>
          {policy.description ? (
            <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{policy.description}</p>
          ) : null}
        </div>
        <StatusLabel tone={policy.status === "active" ? "active" : policy.status === "draft" ? "pending" : "paused"}>
          {t(statusKey(policy.status))}
        </StatusLabel>
      </div>

      <section className="mt-10">
        <SectionLabel>{t("policies.appliesTo")}</SectionLabel>
        <dl className="mt-3 divide-y divide-border border-t border-border">
          <Row label={t("policies.agent")} value={agents.join(", ")} />
          <Row label={t("policies.tools")} value={tools.join(", ")} />
          <Row
            label={t("policies.environment")}
            value={t(
              policy.environment === "staging"
                ? "policies.env.staging"
                : "policies.env.production"
            )}
          />
        </dl>
      </section>

      <section className="mt-10">
        <SectionLabel>{t("policies.rules")}</SectionLabel>
        <div className="mt-4 space-y-3 border-t border-border pt-5">
          {policy.rules.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t("policies.noRules")}</p>
          ) : (
            policy.rules.map((rule) => <PolicyRuleDisplay key={rule.id} rule={rule} />)
          )}
        </div>
      </section>

      {policy.status === "draft" ? (
        <p className="mt-8 max-w-xl text-[13px] text-muted-foreground">{t("policies.draftNote")}</p>
      ) : null}
      {canWrite ? (
        <div className="mt-6 flex items-center gap-2">
          {policy.status === "draft" ? (
            <Button type="button" disabled={publishing} onClick={() => void publish(Boolean(confirmDetail))}>
              {publishing
                ? t("policies.publishing")
                : confirmDetail
                  ? t("policies.publishConfirmButton")
                  : t("policies.publish")}
            </Button>
          ) : null}
          <Link
            href={`/policies/${policy.id}/edit`}
            className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-sm hover:bg-muted"
          >
            {t("policies.edit")}
          </Link>
        </div>
      ) : null}
      {confirmDetail ? (
        <p className="mt-3 max-w-xl text-[13px] text-warning">{t("policies.publishConfirm", { detail: confirmDetail })}</p>
      ) : null}
      {publishError ? <p className="mt-3 text-[13px] text-destructive">{publishError}</p> : null}
    </div>
  );
}

function statusKey(status: PolicyStatus) {
  if (status === "draft") return "policies.draft";
  if (status === "paused") return "policies.paused";
  return "policies.active";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[15px]">{value}</dd>
    </div>
  );
}
