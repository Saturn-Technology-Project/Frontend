"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectorPanel } from "@/components/connector/connector-panel";
import { QueryGate } from "@/components/layout/query-gate";
import { Button } from "@/components/ui/button";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole, useDeleteAgent } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { agentPresence } from "@/lib/agent-presence";
import { useAuthStore } from "@/lib/auth";
import { agentCopy, useI18n } from "@/lib/i18n";
import { usePanelStore } from "@/stores/panel-store";

export default function AgentsPage() {
  const { t, locale } = useI18n();
  const { data, isPending, isError } = useConsole();
  const canAdmin = canAccess(useAuthStore((state) => state.user?.permissions), "team", "write");
  const remove = useDeleteAgent();
  const [confirming, setConfirming] = useState<string | null>(null);
  const live = usePanelStore((state) => state.agents);
  const connectorLive = usePanelStore((state) => state.connectorConnected);
  const agents = data?.agents ?? [];
  const connector = data?.connector ?? null;
  const enrolled = Boolean(connector?.enrolled);
  const connected = connectorLive || Boolean(connector?.connected);
  const firstVisit = !enrolled && agents.length === 0;

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("agents.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t("agents.subtitle")}
        </p>

        {!connected ? (
          <div className={firstVisit ? "mt-10" : "mt-10 border-t border-border pt-8"}>
            <ConnectorPanel connector={connector} />
          </div>
        ) : null}

        {enrolled && !connected && agents.length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("connector.waitingAgents")}</p>
        ) : null}

        {agents.length === 0 && (connected || !enrolled) ? (
          firstVisit ? null : (
            <p className="mt-10 text-[13px] text-muted-foreground">{t("agents.empty")}</p>
          )
        ) : agents.length > 0 ? (
          <ul className="mt-8 divide-y divide-border border-y border-border">
            {agents.map((agent) => {
              const copy = agentCopy(locale, agent.id, agent);
              const presence = agentPresence(agent, live, t);
              return (
                <li key={agent.id} className="flex items-center gap-4">
                  <Link
                    href={`/agents/${agent.id}`}
                    className="grid min-w-0 flex-1 grid-cols-[220px_1fr_120px] items-center gap-6 py-4 hover:bg-muted/40"
                  >
                    <span className="text-[14px] font-medium">{copy.name}</span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {copy.description}
                    </span>
                    <StatusLabel tone={presence.tone} className="justify-self-end">
                      {presence.label}
                    </StatusLabel>
                  </Link>
                  {canAdmin ? (
                    confirming === agent.id ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                          {t("agents.cancel")}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(agent.id, { onSuccess: () => setConfirming(null) })}
                        >
                          {t("agents.confirmRemove")}
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirming(agent.id)}>
                        {t("agents.remove")}
                      </Button>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {remove.isError ? (
          <p className="mt-4 text-[13px] text-destructive">{remove.error.message}</p>
        ) : null}
      </div>
    </QueryGate>
  );
}
