"use client";

import { POLICY_OPERATORS } from "@/lib/policy";
import { formRules, type FlowData, type FlowNode } from "@/lib/policy-graph";
import { useI18n } from "@/lib/i18n";
import type { Edge } from "@xyflow/react";

const cellClass =
  "h-8 rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none focus:border-ring";

export function PolicyForm({
  nodes,
  edges,
  disabled,
  onChange,
}: {
  nodes: FlowNode[];
  edges: Edge[];
  disabled: boolean;
  onChange: (id: string, patch: Partial<FlowData>) => void;
}) {
  const { t } = useI18n();
  const rules = formRules(nodes, edges);
  if (rules.length === 0) {
    return <p className="p-4 text-[13px] text-muted-foreground">{t("policies.formEmpty")}</p>;
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead className="sticky top-0 bg-background">
          <tr className="border-b border-border text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            <th className="px-4 py-2 font-medium">{t("policies.kind.tool")}</th>
            <th className="px-4 py-2 font-medium">{t("policies.kind.condition")}</th>
            <th className="w-[180px] px-4 py-2 font-medium">{t("policies.kind.decision")}</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.toolId} className="border-b border-border align-top">
              <td className="px-4 py-3 font-mono">{rule.tool || t("policies.kind.tool")}</td>
              <td className="px-4 py-3">
                {rule.conditions.length === 0 ? (
                  <span className="text-muted-foreground">{t("policies.formAny")}</span>
                ) : (
                  <div className="grid gap-2">
                    {rule.conditions.map((condition, index) => (
                      <div key={condition.id} className="flex flex-wrap items-center gap-2">
                        {index > 0 ? <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">AND</span> : null}
                        <input
                          disabled={disabled}
                          value={condition.field}
                          aria-label={t("policies.field")}
                          onChange={(event) => onChange(condition.id, { field: event.target.value })}
                          className={`${cellClass} w-[140px] font-mono`}
                        />
                        <select
                          disabled={disabled}
                          value={condition.operator}
                          aria-label={t("policies.kind.condition")}
                          onChange={(event) => onChange(condition.id, { operator: event.target.value })}
                          className={`${cellClass} max-w-[220px]`}
                        >
                          {POLICY_OPERATORS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {t(item.labelKey)}
                            </option>
                          ))}
                        </select>
                        <input
                          disabled={disabled}
                          value={String(condition.value ?? "")}
                          aria-label={t("policies.value")}
                          onChange={(event) => onChange(condition.id, { value: conditionValue(condition.value, event.target.value) })}
                          className={`${cellClass} w-[120px] font-mono`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <select
                  disabled={disabled || !rule.decisionId}
                  value={rule.decision}
                  aria-label={t("policies.kind.decision")}
                  onChange={(event) => {
                    if (!rule.decisionId) return;
                    const decision = event.target.value;
                    if (decision === "allow" || decision === "approval" || decision === "deny") {
                      onChange(rule.decisionId, { decision });
                    }
                  }}
                  className={cellClass}
                >
                  <option value="allow">{t("policies.action.allow")}</option>
                  <option value="approval">{t("policies.action.approval")}</option>
                  <option value="deny">{t("policies.action.deny")}</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function conditionValue(current: string | number | boolean, raw: string): string | number | boolean {
  if (typeof current === "boolean") return raw === "true";
  if (typeof current === "number" && raw.trim() !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}
