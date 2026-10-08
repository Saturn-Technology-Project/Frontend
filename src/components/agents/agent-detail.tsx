"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConversationPanel } from "@/components/agents/conversation";
import {
  BehaviorPanel,
  CONFIG_TABS,
  KnowledgePanel,
  LimitsPanel,
  ModelPanel,
  RuntimePanel,
  ToolsPanel,
  type ConfigTab,
} from "@/components/agents/agent-config";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole, useDeleteAgent } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { agentPresence } from "@/lib/agent-presence";
import { runtimeLabel } from "@/lib/agent-config";
import { relativeTime, formatUsdc } from "@/lib/format";
import { agentCopy, useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Agent, RunStatus } from "@/types";

const runTone: Record<
  RunStatus,
  "running" | "pending" | "completed" | "rejected" | "failed"
> = {
  queued: "pending",
  running: "running",
  awaiting_execution: "running",
  awaiting_approval: "pending",
  executing: "running",
  completed: "completed",
  failed: "failed",
  rejected: "rejected",
};

function initialConfigTab(value: string | null | undefined): ConfigTab {
  return CONFIG_TABS.find((tab) => tab === value) ?? "overview";
}

export function AgentDetail({
  agent,
  initialTab,
}: {
  agent: Agent;
  initialTab?: string | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data } = useConsole();
  const removeAgent = useDeleteAgent();
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions;
  const canAdmin = canAccess(permissions, "team", "write");
  const editIds = user?.agentEditIds;
  const canWrite = canAdmin || (
    canAccess(permissions, "agents", "write") && (editIds == null || editIds.includes(agent.id))
  );
  const agentRuns = (data?.runs ?? []).filter((run) => run.agentId === agent.id);
  const wallet = data?.wallets.find((item) => item.agentId === agent.id);
  const [tab, setTab] = useState<ConfigTab>(initialConfigTab(initialTab));
  const copy = agentCopy(locale, agent.id, agent);
  const presence = agentPresence(agent, {}, t);
  const runtime = runtimeLabel(agent.runtimeId) || agent.runtimeId;

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <div>
        <h1 className="text-[22px] font-medium tracking-tight">{copy.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
          <StatusLabel tone={presence.tone}>{presence.label}</StatusLabel>
          {runtime ? <span>· {runtime}</span> : null}
          {canAdmin ? (
            confirmingRemove ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingRemove(false)}>
                  {t("agents.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={removeAgent.isPending}
                  onClick={() =>
                    removeAgent.mutate(agent.id, { onSuccess: () => router.push("/agents") })
                  }
                >
                  {t("agents.confirmRemove")}
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmingRemove(true)}>
                {t("agents.remove")}
              </Button>
            )
          ) : null}
        </div>
        {removeAgent.isError ? (
          <p className="mt-2 text-[13px] text-destructive">{removeAgent.error.message}</p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-4 md:mt-10 md:flex-row md:gap-12">
        <nav className="-mx-1 flex gap-1 overflow-x-auto md:mx-0 md:w-[128px] md:shrink-0 md:flex-col md:overflow-visible">
          {CONFIG_TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "shrink-0 rounded-full px-3 py-2 text-left text-[13px] md:w-full md:rounded-none md:px-0 md:py-1.5",
                tab === item
                  ? "bg-muted text-foreground md:bg-transparent"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(`agents.config.${item}`)}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <div className={tab === "overview" ? "" : "hidden"}>
            <RuntimePanel agent={agent} data={data} canAdmin={canAdmin} />

            <div className="mt-10">
              <SectionLabel>{t("agents.config.governance")}</SectionLabel>
              <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">
                {t("agents.config.policyLink")}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
                {agent.policyIds.length === 0 ? (
                  <Link href="/policies" className="text-foreground hover:underline">
                    {t("agents.policies")}
                  </Link>
                ) : (
                  agent.policyIds.map((id) => {
                    const policy = data?.policies.find((item) => item.id === id);
                    return (
                      <Link
                        key={id}
                        href={`/policies/${id}`}
                        className="text-foreground hover:underline"
                      >
                        {policy?.name ?? id}
                      </Link>
                    );
                  })
                )}
              </div>
              {wallet ? (
                <div className="mt-8">
                  <SectionLabel>{t("agents.wallet")}</SectionLabel>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[15px]">
                    <Link
                      href={`/wallets/${wallet.id}`}
                      className="text-foreground hover:underline"
                    >
                      {formatUsdc(wallet.balance, wallet.asset)}
                    </Link>
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {wallet.network} · x402
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <ConversationPanel agentId={agent.id} />

            <section className="mt-10 border-t border-border pt-8">
              <SectionLabel>{t("agents.recentRuns")}</SectionLabel>
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {agentRuns.length === 0 ? (
                  <li className="py-4 text-[13px] text-muted-foreground">
                    {t("agents.noRuns")}
                  </li>
                ) : (
                  agentRuns.slice(0, 6).map((run) => (
                    <li key={run.id}>
                      <Link
                        href={`/agents/${agent.id}/runs/${run.id}`}
                        className="flex flex-col items-start gap-2 py-3.5 text-[13px] hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      >
                        <span className="min-w-0 truncate">{run.prompt}</span>
                        <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
                          <StatusLabel tone={runTone[run.status]}>
                            {t(`run.status.${run.status}`)}
                          </StatusLabel>
                          {relativeTime(run.startedAt, locale)}
                        </span>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>

          <div className={tab === "behavior" ? "" : "hidden"}>
            <BehaviorPanel agent={agent} canWrite={canWrite} />
          </div>
          <div className={tab === "tools" ? "" : "hidden"}>
            <ToolsPanel agent={agent} data={data} canWrite={canWrite} />
          </div>
          <div className={tab === "knowledge" ? "" : "hidden"}>
            <KnowledgePanel agent={agent} canWrite={canWrite} />
          </div>
          <div className={tab === "model" ? "" : "hidden"}>
            <ModelPanel agent={agent} canWrite={canWrite} />
          </div>
          <div className={tab === "limits" ? "" : "hidden"}>
            <LimitsPanel agent={agent} wallet={wallet} canAdmin={canAdmin} />
          </div>
        </div>
      </div>
    </div>
  );
}
