"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole, useCreateRun } from "@/hooks/use-console";
import { agentPresence } from "@/lib/agent-presence";
import { relativeTime, formatUsdc } from "@/lib/format";
import { agentCopy, useI18n } from "@/lib/i18n";
import { usePanelStore } from "@/stores/panel-store";
import type { Agent } from "@/types";

export function AgentDetail({ agent }: { agent: Agent }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data } = useConsole();
  const live = usePanelStore((state) => state.agents);
  const createRun = useCreateRun();
  const agentRuns = (data?.runs ?? []).filter((run) => run.agentId === agent.id);
  const wallet = data?.wallets.find((item) => item.agentId === agent.id);
  const [prompt, setPrompt] = useState("");
  const copy = agentCopy(locale, agent.id, agent);
  const presence = agentPresence(agent, live, t);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const run = await createRun.mutateAsync({
      agentId: agent.id,
      prompt: prompt.trim(),
    });
    router.push(`/agents/${agent.id}/runs/${run.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] text-muted-foreground">{t("agents.role")}</div>
          <h1 className="mt-1 text-[22px] font-medium tracking-tight">
            {copy.name}
          </h1>
        </div>
        <StatusLabel tone={presence.tone}>{presence.label}</StatusLabel>
      </div>

      <p className="mt-6 max-w-md text-[15px] leading-7 text-muted-foreground">
        {copy.description}
      </p>

      <div className="mt-10 space-y-8 border-t border-border pt-8">
        <Meta label={t("agents.model")} value={agent.model} />
        <div>
          <SectionLabel>{t("agents.tools")}</SectionLabel>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
            {agent.toolIds.map((id) => {
              const tool = data?.integrations.find((item) => item.id === id);
              return (
                <Link
                  key={id}
                  href={`/tools/${id}`}
                  className="text-foreground hover:underline"
                >
                  {tool?.name ?? id}
                </Link>
              );
            })}
          </div>
        </div>
        <div>
          <SectionLabel>{t("agents.policies")}</SectionLabel>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
            {agent.policyIds.map((id) => {
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
            })}
          </div>
        </div>
        {wallet ? (
          <div>
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
        {createRun.isError ? (
          <p className="mt-2 text-[13px] text-destructive">{t("common.apiError")}</p>
        ) : null}
        <div className="mt-3">
          <Button type="submit" disabled={createRun.isPending || !prompt.trim()}>
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
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-3 text-[15px]">{value}</div>
    </div>
  );
}
