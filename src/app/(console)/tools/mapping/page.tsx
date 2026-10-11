"use client";

import { ToolSetEditor } from "@/components/tools/tool-mapping";
import { QueryGate } from "@/components/layout/query-gate";
import { useConsole } from "@/hooks/use-console";
import { useEntitlements } from "@/hooks/use-entitlements";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";

export default function MappingPage() {
  const { data, isPending, isError } = useConsole();
  const canWrite = canAccess(useAuthStore((state) => state.user?.permissions), "policies", "write");
  const { toolSetLimit } = useEntitlements();
  const mcpServers = data?.mcpServers ?? [];

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-4 py-5 md:px-8 md:py-6">
        <ToolSetEditor
          servers={mcpServers}
          toolSets={data?.toolSets ?? []}
          agents={(data?.agents ?? []).filter((agent) => agent.origin === "saturn_mcp")}
          toolSetLimit={toolSetLimit}
          canWrite={canWrite}
        />
      </div>
    </QueryGate>
  );
}
