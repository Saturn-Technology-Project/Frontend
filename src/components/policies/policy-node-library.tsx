"use client";

import type { Dispatch, DragEvent, SetStateAction } from "react";
import type { ToolGroup } from "@/components/policies/policy-builder-schema";
import { useI18n } from "@/lib/i18n";
import { blankData, newNode, type FlowNode } from "@/lib/policy-graph";
import { cn } from "@/lib/utils";
import type { PolicyDefinition, PolicyNodeKind } from "@/types";

const kinds: PolicyNodeKind[] = ["subject", "tool", "condition", "logic", "decision", "enforcement"];

export const NODE_DRAG_TYPE = "application/saturn-node";

export function isNodeKind(value: string): value is PolicyNodeKind {
  return kinds.includes(value as PolicyNodeKind);
}

/** The column left of the canvas: node kinds to drag or click in, and the tools of the chosen set. */
export function PolicyNodeLibrary({
  canWrite,
  toolGroups,
  toolNames,
  analyses,
  setNodes,
}: {
  canWrite: boolean;
  toolGroups: ToolGroup[];
  toolNames: string[];
  analyses: PolicyDefinition["analyses"];
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
}) {
  const { t } = useI18n();

  function onDragStart(event: DragEvent, kind: PolicyNodeKind) {
    event.dataTransfer.setData(NODE_DRAG_TYPE, kind);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside className="hidden w-[220px] shrink-0 overflow-y-auto border-r border-border p-3 md:block">
      <h2 className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("policies.library")}</h2>
      <div className="mt-2 grid gap-1.5">
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            draggable={canWrite}
            onDragStart={(event) => onDragStart(event, kind)}
            onClick={() => canWrite && setNodes((currentNodes) => currentNodes.concat(newNode(kind, { x: 80, y: 80 + currentNodes.length * 24 })))}
            className="rounded-md border border-border px-2 py-2 text-left text-[13px] hover:bg-muted"
          >
            {t(`policies.kind.${kind}`)}
          </button>
        ))}
      </div>
      <h2 className="mt-6 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("policies.inventory")}</h2>
      <div className="mt-3 space-y-4">
        {(toolGroups.length ? toolGroups : [{ id: "canvas", name: "", tools: toolNames.map((name) => ({ name })) }]).map((group) => (
          <section key={group.id}>
            {toolGroups.length ? (
              <h3 className="truncate px-2 text-[11px] font-medium tracking-wide text-muted-foreground">
                {group.name || t("policies.otherServer")}
              </h3>
            ) : null}
            <div className={cn("grid gap-0.5", group.name && "mt-1")}>
              {group.tools.map((item) => {
                const analysis = analyses.find((entry) => entry.tool === item.name);
                return (
                  <button
                    key={item.name}
                    type="button"
                    disabled={!canWrite}
                    onClick={() =>
                      setNodes((currentNodes) =>
                        currentNodes.concat({
                          ...newNode("tool", { x: 40, y: 40 + currentNodes.length * 20 }),
                          data: {
                            ...blankData("tool"),
                            tool: item.name,
                            classification: analysis
                              ? {
                                  status: analysis.status,
                                  operation: analysis.operation,
                                  resource: analysis.resource,
                                  risk: analysis.risk,
                                  sideEffects: analysis.sideEffects,
                                  rationale: analysis.rationale,
                                }
                              : undefined,
                          },
                        })
                      )
                    }
                    className="truncate rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-muted"
                  >
                    <span className="font-mono">{item.name}</span>
                    {analysis && analysis.status !== "analyzed" ? (
                      <span className="mt-0.5 block text-muted-foreground">{t("policies.notAnalyzed")}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
