"use client";

import { useParams } from "next/navigation";
import { QueryGate } from "@/components/layout/query-gate";
import { RunView } from "@/components/runs/run-view";
import { useConsole } from "@/hooks/use-console";
import { useI18n } from "@/lib/i18n";

export default function RunPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string; runId: string }>();
  const { data, isPending, isError } = useConsole();
  const run = data?.runs.find((item) => item.id === params.runId);

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      {!run ? (
        <div className="px-4 py-6 md:px-10 md:py-10 text-[13px] text-muted-foreground">
          {t("run.notFound")}
        </div>
      ) : (
        <RunView run={run} />
      )}
    </QueryGate>
  );
}
