"use client";

import { ConnectorPanel } from "@/components/connector/connector-panel";
import { ToolCard } from "@/components/tools/tool-card";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole } from "@/hooks/use-console";
import { useI18n } from "@/lib/i18n";
import { groupToolsByPrefix } from "@/lib/mcp";
import { usePanelStore } from "@/stores/panel-store";

export default function ToolsPage() {
  const { t } = useI18n();
  const { data, isPending, isError } = useConsole();
  const connectorLive = usePanelStore((state) => state.connectorConnected);
  const connector = data?.connector ?? null;
  const enrolled = Boolean(connector?.enrolled);
  const connected = connectorLive || Boolean(connector?.connected);
  const mcpServers = data?.mcpServers ?? [];
  const integrations = data?.integrations ?? [];
  const firstVisit = !enrolled && mcpServers.length === 0 && integrations.length === 0;
  const catalog = mcpServers.length > 0 ? mcpServers : null;

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("tools.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t("tools.subtitle")}
        </p>

        {!connected ? (
          <div className={firstVisit ? "mt-10" : "mt-10 border-t border-border pt-8"}>
            <ConnectorPanel connector={connector} />
          </div>
        ) : null}

        {enrolled && !connected && mcpServers.length === 0 && integrations.length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("connector.waitingMcp")}</p>
        ) : null}

        {catalog ? (
          <ul className="mt-8 max-w-[720px] divide-y divide-border border-y border-border">
            {catalog.map((server) => (
              <li key={server.id} className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[14px] font-medium">{server.name}</div>
                  <StatusLabel
                    tone={server.connected ? "connected" : "disconnected"}
                  >
                    {server.connected
                      ? t("tools.connected")
                      : t("connector.offline")}
                  </StatusLabel>
                </div>
                {server.endpoint ? (
                  <div className="mt-1 font-mono text-[12px] text-muted-foreground">
                    {server.endpoint}
                  </div>
                ) : null}
                {server.tools.length ? (
                  <div className="mt-6 space-y-6">
                    {groupToolsByPrefix(server.tools).map((group) => (
                      <div key={group.prefix}>
                        <SectionLabel>{group.prefix}</SectionLabel>
                        <ul className="mt-2 divide-y divide-border border-y border-border">
                          {group.names.map((name) => (
                            <li
                              key={name}
                              className="py-2.5 font-mono text-[13px] text-foreground"
                            >
                              {name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-[12px] text-muted-foreground">
                    {t("tools.count", { n: 0 })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : integrations.length > 0 ? (
          <div className="mt-8 grid max-w-[720px] grid-cols-2 gap-3">
            {integrations.map((integration) => (
              <ToolCard key={integration.id} integration={integration} />
            ))}
          </div>
        ) : firstVisit ? null : (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("tools.empty")}</p>
        )}
      </div>
    </QueryGate>
  );
}
