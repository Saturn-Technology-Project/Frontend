"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusDot, StatusLabel } from "@/components/ui/status-dot";
import { greeting, relativeTime } from "@/lib/format";
import { eventActor, eventText, useI18n } from "@/lib/i18n";
import { useConsole } from "@/hooks/use-console";
import type { ActivityEvent } from "@/types";

export default function OverviewPage() {
  const { t, locale } = useI18n();
  const { data, isPending, isError } = useConsole();
  const events = data?.events ?? [];
  const pendingCount = (data?.approvals ?? []).filter(
    (approval) => approval.status === "pending"
  ).length;
  const agents = data?.agents ?? [];
  const running = agents.filter((agent) => agent.running).length;
  const services = data?.services ?? [];
  const walletTotal = (data?.wallets ?? []).reduce(
    (sum, wallet) => sum + Number(wallet.balance),
    0
  );

  const recent = [...events]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="flex min-h-full">
        <div className="min-w-0 flex-1 px-10 py-10">
          <h1 className="text-[28px] font-medium tracking-tight">
            {greeting(locale)}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {t("overview.opsNormal")}
          </p>

          <div className="mt-12 grid grid-cols-4 gap-8 border-y border-border py-7">
            <Stat label={t("overview.activeAgents")} value={String(agents.length)} />
            <Stat label={t("overview.running")} value={String(running)} />
            <Stat label={t("overview.approvals")} value={String(pendingCount)} />
            <Stat
              label={t("overview.walletUsdc")}
              value={walletTotal.toFixed(2)}
            />
          </div>

          <section className="mt-10">
            <SectionLabel className="mb-3">{t("overview.recentActivity")}</SectionLabel>
            {recent.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">{t("activity.empty")}</p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {recent.map((event) => (
                  <OverviewEvent key={event.id} event={event} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="w-[280px] shrink-0 border-l border-border px-6 py-10">
          <SectionLabel>{t("overview.systemStatus")}</SectionLabel>
          <ul className="mt-5 space-y-3">
            {services.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between gap-3 text-[13px]"
              >
                <span>{t(`service.${service.id}`)}</span>
                <StatusLabel tone={service.status}>
                  {service.status === "operational"
                    ? t("overview.operational")
                    : service.status}
                </StatusLabel>
              </li>
            ))}
          </ul>
          {data?.x402 ? (
            <div className="mt-10">
              <SectionLabel>{t("wallets.facilitator")}</SectionLabel>
              <div className="mt-4 font-mono text-[13px] text-muted-foreground">
                {data.x402.scheme} · {data.x402.network}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </QueryGate>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-3 font-mono text-[28px] leading-none tracking-tight">
        {value}
      </div>
    </div>
  );
}

function eventState(event: ActivityEvent) {
  if (
    event.event === "approval_requested" ||
    event.titleKey === "event.approvalRequested" ||
    event.detailKey === "event.approvalRequired"
  ) {
    return "approval" as const;
  }
  if (
    event.event === "run_completed" ||
    event.event === "tool_executed" ||
    event.event === "approval_granted" ||
    event.event === "x402_settled"
  ) {
    return "completed" as const;
  }
  return "other" as const;
}

function OverviewEvent({ event }: { event: ActivityEvent }) {
  const { locale, t } = useI18n();
  const { data } = useConsole();
  const run = data?.runs.find((item) => item.id === event.runId);
  const href = run
    ? `/agents/${run.agentId}/runs/${run.id}`
    : event.approvalId
      ? "/approvals"
      : "/activity";
  const state = eventState(event);

  return (
    <li>
      <Link
        href={href}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 py-4 hover:bg-muted/40"
      >
        <div className="min-w-0">
          <div className="text-[13px] font-medium">
            {eventActor(locale, event)}
          </div>
          <div className="mt-1 truncate text-[13px] text-muted-foreground">
            {eventText(locale, event.titleKey, event.title)}
          </div>
        </div>
        <div className="pt-0.5 text-right">
          <div className="text-[12px] text-muted-foreground">
            {relativeTime(event.at, locale)}
          </div>
          {state === "completed" ? (
            <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-success">
              <Check className="size-3" />
              {t("overview.completed")}
            </div>
          ) : state === "approval" ? (
            <div className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-warning">
              <StatusDot tone="pending" />
              {t("overview.approvalRequired")}
            </div>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
