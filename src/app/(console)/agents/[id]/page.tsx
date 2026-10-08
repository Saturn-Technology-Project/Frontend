"use client";

import { useParams, useSearchParams } from "next/navigation";
import { AgentDetail } from "@/components/agents/agent-detail";
import { QueryGate } from "@/components/layout/query-gate";
import { useConsole } from "@/hooks/use-console";
import { useI18n } from "@/lib/i18n";

export default function AgentPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const { data, isPending, isError } = useConsole();
  const agent = data?.agents.find((item) => item.id === params.id);

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      {!agent ? (
        <div className="px-4 py-6 md:px-10 md:py-10 text-[13px] text-muted-foreground">
          {t("agents.notFound")}
        </div>
      ) : (
        <div className="px-4 py-6 md:px-10 md:py-10">
          <AgentDetail key={agent.id} agent={agent} initialTab={search.get("tab")} />
        </div>
      )}
    </QueryGate>
  );
}
