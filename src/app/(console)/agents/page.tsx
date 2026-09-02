"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole } from "@/hooks/use-console";
import { agentCopy, useI18n } from "@/lib/i18n";

export default function AgentsPage() {
  const { t, locale } = useI18n();
  const { data, isPending, isError } = useConsole();
  const agents = data?.agents ?? [];

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("agents.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t("agents.subtitle")}
        </p>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {agents.map((agent) => {
            const copy = agentCopy(locale, agent.id, agent);
            return (
              <li key={agent.id}>
                <Link
                  href={`/agents/${agent.id}`}
                  className="grid grid-cols-[220px_1fr_120px] items-center gap-6 py-4 hover:bg-muted/40"
                >
                  <span className="text-[14px] font-medium">{copy.name}</span>
                  <span className="truncate text-[13px] text-muted-foreground">
                    {copy.description}
                  </span>
                  <StatusLabel
                    tone={agent.running ? "running" : "active"}
                    className="justify-self-end"
                  >
                    {agent.running ? t("agents.running") : t("agents.active")}
                  </StatusLabel>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </QueryGate>
  );
}
