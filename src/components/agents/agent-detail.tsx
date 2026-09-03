"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AgentConnectPanel } from "@/components/agents/agent-connect";
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
import { useConsole, useCreateRun } from "@/hooks/use-console";
import { sendPanelCommand } from "@/hooks/use-panel-socket";
import { canAccess } from "@/lib/access";
import { agentPresence } from "@/lib/agent-presence";
import { runtimeLabel } from "@/lib/agent-config";
import { relativeTime, formatUsdc } from "@/lib/format";
import { agentCopy, useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth";
import { usePanelStore } from "@/stores/panel-store";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types";

export function AgentDetail({ agent }: { agent: Agent }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data } = useConsole();
  const live = usePanelStore((state) => state.agents);
  const createRun = useCreateRun();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canWrite = canAccess(permissions, "agents", "write");
  const canAdmin = canAccess(permissions, "team", "write");
  const agentRuns = (data?.runs ?? []).filter((run) => run.agentId === agent.id);
  const wallet = data?.wallets.find((item) => item.agentId === agent.id);
  const [tab, setTab] = useState<ConfigTab>("overview");
  const [prompt, setPrompt] = useState("");
  const [dispatchError, setDispatchError] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const copy = agentCopy(locale, agent.id, agent);
  const presence = agentPresence(agent, live, t);
  const viaConnector = Boolean(agent.connectorId);
  const runtime = runtimeLabel(agent.runtimeId) || agent.runtimeId;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setDispatchError(false);
    const text = prompt.trim();
    if (!text) return;
    setDispatching(true);
    try {
      try {
        const result = await sendPanelCommand({
          command: "run",
          agentId: agent.id,
          input: text,
        });
        if (result.run?.id) {
          router.push(`/agents/${agent.id}/runs/${result.run.id}`);
          return;
        }
      } catch {
        // Panel socket is down; fall back to HTTP.
      }
      const run = await createRun.mutateAsync({
        agentId: agent.id,
        prompt: text,
      });
      router.push(`/agents/${agent.id}/runs/${run.id}`);
    } catch {
      setDispatchError(true);
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <div>
        <h1 className="text-[22px] font-medium tracking-tight">{copy.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
          <StatusLabel tone={presence.tone}>{presence.label}</StatusLabel>
          {runtime ? <span>· {runtime}</span> : null}
        </div>
      </div>

      <div className="mt-10 flex gap-12">
        <nav className="w-[128px] shrink-0">
          {CONFIG_TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "block w-full py-1.5 text-left text-[13px]",
                tab === item
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(`agents.config.${item}`)}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <div className={tab === "overview" ? "" : "hidden"}>
            {!viaConnector ? <AgentConnectPanel key={agent.id} agent={agent} /> : null}

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

            <form onSubmit={onSubmit} className="mt-10 border-t border-border pt-8">
              <SectionLabel>{t("agents.dispatch")}</SectionLabel>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t("agents.promptPlaceholder")}
                rows={3}
                className="mt-3 w-full resize-none rounded-md border border-border bg-card px-3 py-3 text-[14px] leading-6 outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {dispatchError || createRun.isError ? (
                <p className="mt-2 text-[13px] text-destructive">{t("common.apiError")}</p>
              ) : null}
              <div className="mt-3">
                <Button
                  type="submit"
                  disabled={dispatching || createRun.isPending || !prompt.trim()}
                >
                  {t("agents.runAgent")}
                </Button>
              </div>
            </form>

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
                        className="flex items-center justify-between gap-4 py-3.5 text-[13px] hover:bg-muted/40"
                      >
                        <span className="min-w-0 truncate">{run.prompt}</span>
                        <span className="shrink-0 text-muted-foreground">
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
