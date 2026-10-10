"use client";

import { ToolSetEditor } from "@/components/tools/tool-mapping";
import { QueryGate } from "@/components/layout/query-gate";
import { useConsole } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function MappingPage() {
  const { t } = useI18n();
  const { data, isPending, isError } = useConsole();
  const canAdmin = canAccess(useAuthStore((state) => state.user?.permissions), "team", "write");
  const mcpServers = data?.mcpServers ?? [];

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-4 py-5 md:px-8 md:py-6">
        {canAdmin ? (
          <ToolSetEditor
            servers={mcpServers}
            toolSets={data?.toolSets ?? []}
            agents={(data?.agents ?? []).filter((agent) => agent.origin === "saturn_mcp")}
          />
        ) : (
          <>
            <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{t("nav.mapping")}</h1>
            <p className="mt-4 text-[13px] text-muted-foreground">{t("marketplace.adminOnly")}</p>
          </>
        )}
      </div>
    </QueryGate>
  );
}
