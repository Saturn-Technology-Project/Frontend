"use client";

import { useState } from "react";
import Link from "next/link";
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
  const agents = data?.agents ?? [];

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("agents.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t("agents.subtitle")}
        </p>

        {agents.length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("agents.empty")}</p>
        ) : (
          <ul className="mt-8 grid grid-cols-3 gap-3">
            {agents.map((agent) => {
              const copy = agentCopy(locale, agent.id, agent);
              const presence = agentPresence(agent, live, t);
              return (
                <li key={agent.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/agents/${agent.id}`} className="min-w-0">
                      <span className="block truncate text-[15px] font-medium">{copy.name}</span>
                      <span className="mt-1 line-clamp-2 block text-[13px] text-muted-foreground">
                        {copy.description || "—"}
                      </span>
                    </Link>
                    <StatusLabel tone={presence.tone}>{presence.label}</StatusLabel>
                  </div>
                  <div className="mt-4 text-[12px] text-muted-foreground">{agent.model || "—"}</div>
                  {canAdmin ? (
                    confirming === agent.id ? (
                      <div className="mt-4 flex items-center gap-2">
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
                      <Button className="mt-4 self-start" variant="ghost" size="sm" onClick={() => setConfirming(agent.id)}>
                        {t("agents.remove")}
                      </Button>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {remove.isError ? (
          <p className="mt-4 text-[13px] text-destructive">{remove.error.message}</p>
        ) : null}
      </div>
    </QueryGate>
  );
}
