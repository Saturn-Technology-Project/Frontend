"use client";

import { ToolCard } from "@/components/tools/tool-card";
import { QueryGate } from "@/components/layout/query-gate";
import { useConsole } from "@/hooks/use-console";
import { useI18n } from "@/lib/i18n";

export default function ToolsPage() {
  const { t } = useI18n();
  const { data, isPending, isError } = useConsole();
  const integrations = data?.integrations ?? [];

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("tools.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t("tools.subtitle")}
        </p>
        <div className="mt-8 grid max-w-[720px] grid-cols-2 gap-3">
          {integrations.map((integration) => (
            <ToolCard key={integration.id} integration={integration} />
          ))}
        </div>
      </div>
    </QueryGate>
  );
}
