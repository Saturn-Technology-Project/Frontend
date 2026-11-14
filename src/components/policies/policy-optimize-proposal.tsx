"use client";

import { Button } from "@/components/ui/button";
import type { PolicyDiff } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { PolicyDefinition } from "@/types";

export interface PolicyProposal {
  definition: PolicyDefinition;
  diff: PolicyDiff[];
  json: string;
}

/** What the optimizer suggests, shown beside the JSON editor until it is applied or discarded. */
export function PolicyOptimizeProposal({
  proposal,
  canWrite,
  onApply,
  onDiscard,
}: {
  proposal: PolicyProposal;
  canWrite: boolean;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 flex-col border-l border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <h2 className="text-[13px] font-medium">{t("policies.changes")}</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={!canWrite}
            onClick={onApply}
          >
            {t("policies.applyOptimized")}
          </Button>
          <Button type="button" variant="outline" onClick={onDiscard}>
            {t("policies.discardOptimized")}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
        {proposal.diff.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t("policies.noChanges")}</p>
        ) : (
          <ul className="space-y-3">
            {proposal.diff.map((change) => (
              <li key={`${change.kind}-${change.path}`} className="text-[13px]">
                <div className="font-medium">{change.summary}</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{change.path}</div>
                <div className="mt-1 grid gap-2 md:grid-cols-2">
                  <pre className="overflow-auto rounded-md bg-muted p-2 font-mono text-[11px]">{JSON.stringify(change.before, null, 2)}</pre>
                  <pre className="overflow-auto rounded-md bg-muted p-2 font-mono text-[11px]">{JSON.stringify(change.after, null, 2)}</pre>
                </div>
              </li>
            ))}
          </ul>
        )}
        <h2 className="mt-6 text-[13px] font-medium">{t("policies.optimized")}</h2>
        <pre className="mt-2 overflow-auto font-mono text-[12px] leading-5">{proposal.json}</pre>
      </div>
    </div>
  );
}
