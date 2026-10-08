"use client";

import Link from "next/link";
import { PolicyRuleDisplay } from "@/components/policies/policy-rule-display";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useI18n } from "@/lib/i18n";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import type { Policy } from "@/types";

export function PolicyView({ policy }: { policy: Policy }) {
  const { t } = useI18n();
  const canWrite = canAccess(
    useAuthStore((state) => state.user?.permissions),
    "policies",
    "write"
  );
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
        <StatusLabel tone={policy.status === "active" ? "active" : "paused"}>
          {t(policy.status === "active" ? "policies.active" : "policies.paused")}
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

      {canWrite ? (
        <div className="mt-10">
          <Link
            href={`/policies/${policy.id}/edit`}
            className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-sm hover:bg-muted"
          >
            {t("policies.edit")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[15px]">{value}</dd>
    </div>
  );
}
