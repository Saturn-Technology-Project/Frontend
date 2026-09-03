"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { FIELD_OPTIONS, POLICY_ACTIONS, POLICY_OPERATORS } from "@/lib/policy";
import type { PolicyAction } from "@/types";

const inputClass =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

export interface DraftCondition {
  field: string;
  operator: string;
  value: string;
}

export interface DraftRule {
  key: string;
  conditions: DraftCondition[];
  decision: PolicyAction;
}

export function emptyCondition(): DraftCondition {
  return { field: "amount", operator: "gt", value: "100" };
}

export function emptyRule(): DraftRule {
  return {
    key: `rule_${Math.random().toString(36).slice(2, 8)}`,
    conditions: [emptyCondition()],
    decision: "approval_required",
  };
}

export function PolicyRuleBuilder({
  rule,
  onChange,
  onRemove,
  canRemove,
}: {
  rule: DraftRule;
  onChange: (rule: DraftRule) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { t } = useI18n();

  function updateCondition(index: number, patch: Partial<DraftCondition>) {
    onChange({
      ...rule,
      conditions: rule.conditions.map((item, current) =>
        current === index ? { ...item, ...patch } : item
      ),
    });
  }

  return (
    <div className="border border-border px-5 py-5">
      <div className="flex items-center justify-between">
        <div className="saturn-label">{t("policies.if")}</div>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-[12px] text-muted-foreground hover:text-foreground"
          >
            {t("policies.removeRule")}
          </button>
        ) : null}
      </div>
      <div className="mt-3 space-y-3">
        {rule.conditions.map((condition, index) => (
          <div key={`${rule.key}-${index}`}>
            {index > 0 ? (
              <div className="mb-3 text-[12px] text-muted-foreground">{t("policies.and")}</div>
            ) : null}
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
              <select
                value={condition.field}
                onChange={(event) => updateCondition(index, { field: event.target.value })}
                className={inputClass}
              >
                {FIELD_OPTIONS.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
                {condition.field &&
                !(FIELD_OPTIONS as readonly string[]).includes(condition.field) ? (
                  <option value={condition.field}>{condition.field}</option>
                ) : null}
              </select>
              <select
                value={condition.operator}
                onChange={(event) => updateCondition(index, { operator: event.target.value })}
                className={inputClass}
              >
                {POLICY_OPERATORS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.labelKey)}
                  </option>
                ))}
              </select>
              <input
                value={condition.value}
                onChange={(event) => updateCondition(index, { value: event.target.value })}
                className={inputClass}
                placeholder={condition.field === "amount" ? "$100" : ""}
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({ ...rule, conditions: [...rule.conditions, emptyCondition()] })
          }
        >
          {t("policies.addCondition")}
        </Button>
      </div>
      <div className="mt-6 saturn-label">{t("policies.then")}</div>
      <select
        value={rule.decision}
        onChange={(event) =>
          onChange({ ...rule, decision: event.target.value as PolicyAction })
        }
        className={`${inputClass} mt-3 max-w-[240px]`}
      >
        {POLICY_ACTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {t(item.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
