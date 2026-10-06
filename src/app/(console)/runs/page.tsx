"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole } from "@/hooks/use-console";
import { relativeTime } from "@/lib/format";
import { agentCopy, useI18n } from "@/lib/i18n";
import type { RunStatus } from "@/types";

const tone: Record<RunStatus, "running" | "pending" | "completed" | "rejected" | "failed"> = {
  queued: "pending",
  running: "running",
  awaiting_execution: "running",
  awaiting_approval: "pending",
  executing: "running",
  completed: "completed",
  failed: "failed",
  rejected: "rejected",
};

export default function RunsPage() {
  const { t, locale } = useI18n();
  const { data, isPending, isError } = useConsole();
  const runs = data?.runs ?? [];

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("runs.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("runs.subtitle")}</p>
        {runs.length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("runs.empty")}</p>
        ) : (
          <ul className="mt-8 divide-y divide-border border-y border-border">
            {runs.map((run) => {
              const agent = data?.agents.find((item) => item.id === run.agentId);
              const name = agent ? agentCopy(locale, agent.id, agent).name : run.agentId;
              return (
                <li key={run.id}>
                  <Link
                    href={`/agents/${run.agentId}/runs/${run.id}`}
                    className="grid grid-cols-[180px_1fr_140px_140px] items-center gap-4 py-4 hover:bg-muted/40"
                  >
                    <span className="text-[13px] font-medium">{name}</span>
                    <span className="truncate text-[13px] text-muted-foreground">{run.prompt}</span>
                    <span className="text-[12px] text-muted-foreground">
                      {relativeTime(run.startedAt, locale)}
                    </span>
                    <StatusLabel tone={tone[run.status]} className="justify-self-end">
                      {t(`run.status.${run.status}`)}
                    </StatusLabel>
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
