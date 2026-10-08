"use client";

import { ToolCard } from "@/components/tools/tool-card";
import { Marketplace } from "@/components/tools/marketplace";
import { QueryGate } from "@/components/layout/query-gate";
import { useConsole } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";

export default function ToolsPage() {
  const { data, isPending, isError } = useConsole();
  const canAdmin = canAccess(useAuthStore((state) => state.user?.permissions), "team", "write");
  const mcpServers = data?.mcpServers ?? [];
  const integrations = data?.integrations ?? [];

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <Marketplace servers={mcpServers} canAdmin={canAdmin} />
      {integrations.length > 0 && mcpServers.length === 0 ? (
        <div className="grid max-w-[720px] grid-cols-1 gap-3 px-4 pb-6 sm:grid-cols-2 md:px-8">
          {integrations.map((integration) => (
            <ToolCard key={integration.id} integration={integration} />
          ))}
        </div>
      ) : null}
    </QueryGate>
  );
}
