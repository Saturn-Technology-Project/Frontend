"use client";

import Link from "next/link";
import { StatusLabel } from "@/components/ui/status-dot";
import { useI18n } from "@/lib/i18n";
import type { Integration } from "@/types";

export function ToolCard({ integration }: { integration: Integration }) {
  const { t } = useI18n();

  return (
    <Link
      href={`/tools/${integration.id}`}
      className="block rounded-md border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="text-[15px] font-medium">{integration.name}</div>
        <StatusLabel tone={integration.status}>
          {integration.status === "connected" ? "" : integration.status}
        </StatusLabel>
      </div>
      <div className="mt-3 text-[12px] text-muted-foreground">
        {integration.description || t("tools.count", { n: integration.toolCount })}
      </div>
      <div className="mt-1 text-[12px] text-muted-foreground">
        {integration.x402
          ? `x402 · ${integration.x402.price} ${integration.x402.asset}`
          : t("tools.connected")}
      </div>
    </Link>
  );
}
