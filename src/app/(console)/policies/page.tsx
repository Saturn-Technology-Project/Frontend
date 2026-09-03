"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { relativeTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { domainFromTool } from "@/lib/policy";

export default function PoliciesPage() {
  const { t, locale } = useI18n();
  const { data, isPending, isError } = useConsole();
  const policies = data?.policies ?? [];
  const canWrite = canAccess(
    useAuthStore((state) => state.user?.permissions),
    "policies",
    "write"
  );

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-10 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[22px] font-medium tracking-tight">{t("policies.title")}</h1>
            <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
              {t("policies.subtitle")}
            </p>
          </div>
          {canWrite ? (
            <Link
              href="/policies/new"
              className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-sm hover:bg-muted"
            >
              {t("policies.create")}
            </Link>
          ) : null}
        </div>

        {policies.length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("policies.empty")}</p>
        ) : (
          <ul className="mt-8 max-w-[680px] space-y-3">
            {policies.map((policy) => {
              const domain = domainFromTool(policy.tools[0] ?? "");
              const usedBy =
                policy.agents.length > 0
                  ? policy.agents.join(", ")
                  : t("policies.allAgents");
              return (
                <li key={policy.id}>
                  <Link
                    href={`/policies/${policy.id}`}
                    className="block border border-border px-5 py-5 hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-[15px] font-medium">{policy.name}</div>
                      <StatusLabel
                        tone={policy.status === "active" ? "active" : "paused"}
                      >
                        {t(policy.status === "active" ? "policies.active" : "policies.paused")}
                      </StatusLabel>
                    </div>
                    <div className="mt-2 text-[13px] text-muted-foreground">
                      {[domain, t("policies.rulesCount", { n: policy.rules.length })]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    {policy.updatedAt ? (
                      <div className="mt-1 text-[12px] text-muted-foreground">
                        {t("policies.updated", {
                          time: relativeTime(policy.updatedAt, locale),
                        })}
                      </div>
                    ) : null}
                    <div className="mt-4 text-[13px] text-muted-foreground">
                      {t("policies.usedBy")}: {usedBy}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </QueryGate>
  );
}
