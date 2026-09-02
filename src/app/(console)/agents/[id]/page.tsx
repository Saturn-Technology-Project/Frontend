"use client";

import { useParams } from "next/navigation";
import { AgentDetail } from "@/components/agents/agent-detail";
import { QueryGate } from "@/components/layout/query-gate";
import { useConsole } from "@/hooks/use-console";
import { useI18n } from "@/lib/i18n";

export default function AgentPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const { data, isPending, isError } = useConsole();
  const agent = data?.agents.find((item) => item.id === params.id);

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      {!agent ? (
        <div className="px-10 py-10 text-[13px] text-muted-foreground">
          {t("agents.notFound")}
        </div>
      ) : (
        <div className="px-10 py-10">
          <AgentDetail agent={agent} />
        </div>
      )}
    </QueryGate>
  );
}
