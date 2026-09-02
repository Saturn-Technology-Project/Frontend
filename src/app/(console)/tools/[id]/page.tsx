"use client";

import { useParams } from "next/navigation";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole } from "@/hooks/use-console";
import { useI18n } from "@/lib/i18n";
import type { ToolPermission } from "@/types";

export default function ToolDetailPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const { data, isPending, isError } = useConsole();
  const integration = data?.integrations.find((item) => item.id === params.id);

  const permissionLabel: Record<ToolPermission, string> = {
    allow: t("tools.allow"),
    approval: t("tools.approval"),
    denied: t("tools.denied"),
  };

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      {!integration ? (
        <div className="px-10 py-10 text-[13px] text-muted-foreground">
          {t("tools.notFound")}
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[680px] px-10 py-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-[11px] text-muted-foreground">MCP</div>
              <h1 className="mt-1 text-[22px] font-medium tracking-tight">
                {integration.name}
              </h1>
              {integration.description ? (
                <p className="mt-3 text-[13px] text-muted-foreground">
                  {integration.description}
                </p>
              ) : null}
            </div>
            <StatusLabel
              tone={integration.status === "connected" ? "connected" : "disconnected"}
            >
              {integration.status === "connected" ? t("tools.connected") : integration.status}
            </StatusLabel>
          </div>

          {integration.endpoint ? (
            <section className="mt-10">
              <SectionLabel>Endpoint</SectionLabel>
              <div className="mt-3 font-mono text-[13px] text-muted-foreground">
                {integration.endpoint}
              </div>
            </section>
          ) : null}

          {integration.x402 ? (
            <section className="mt-10">
              <SectionLabel>{t("tools.x402")}</SectionLabel>
              <ul className="mt-3 divide-y divide-border border-y border-border text-[13px]">
                <li className="flex items-center justify-between gap-4 py-3">
                  <span>{t("tools.paid")}</span>
                  <span className="font-mono">
                    {integration.x402.price} {integration.x402.asset}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-4 py-3">
                  <span>{t("wallets.network")}</span>
                  <span className="font-mono">{integration.x402.network}</span>
                </li>
                {integration.x402.payTo ? (
                  <li className="flex items-center justify-between gap-4 py-3">
                    <span>{t("wallets.payTo")}</span>
                    <span className="break-all font-mono text-[12px] text-muted-foreground">
                      {integration.x402.payTo}
                    </span>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          <section className="mt-10">
            <SectionLabel>{t("tools.list")}</SectionLabel>
            <ul className="mt-3 divide-y divide-border border-y border-border font-mono text-[13px]">
              {integration.functions.map((fn) => (
                <li key={fn.name} className="py-3">
                  {fn.name}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10">
            <SectionLabel>{t("tools.permissions")}</SectionLabel>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {integration.functions.map((fn) => (
                <li
                  key={fn.name}
                  className="flex items-center justify-between gap-4 py-3 text-[13px]"
                >
                  <span className="font-mono">{fn.name}</span>
                  <span
                    className={
                      fn.permission === "denied"
                        ? "text-destructive"
                        : fn.permission === "approval"
                          ? "text-warning"
                          : "text-success"
                    }
                  >
                    {fn.permission === "allow" ? "✓" : permissionLabel[fn.permission]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </QueryGate>
  );
}
