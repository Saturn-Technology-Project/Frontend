"use client";

import { useI18n } from "@/lib/i18n";
import {
  formatConditionValue,
  normalizeDecision,
  POLICY_OPERATORS,
} from "@/lib/policy";
import type { PolicyRule } from "@/types";

export function PolicyRuleDisplay({ rule }: { rule: PolicyRule }) {
  const { t } = useI18n();
  const conditions =
    rule.conditions.length > 0
      ? rule.conditions
      : rule.condition
        ? [{ field: rule.condition, operator: "", value: "" }]
        : [];
  const decision = normalizeDecision(rule.decision);
  const decisionKey =
    decision === "allow"
      ? "policies.action.allow"
      : decision === "deny"
        ? "policies.action.deny"
        : "policies.action.approval";

  return (
    <div className="border border-border px-5 py-5">
      {rule.tool ? <div className="mb-4 font-mono text-[13px]">{rule.tool}</div> : null}
      <div className="saturn-label">{t("policies.if")}</div>
      <div className="mt-3 space-y-3">
        {conditions.length === 0 ? (
          <div className="text-[15px] text-muted-foreground">true</div>
        ) : (
          conditions.map((item, index) => (
            <div key={`${item.field}-${index}`}>
              {index > 0 ? (
                <div className="mb-3 text-[12px] text-muted-foreground">{t("policies.and")}</div>
              ) : null}
              {item.operator ? (
                <div className="space-y-1 text-[15px] leading-6">
                  <div>{item.field}</div>
                  <div className="text-muted-foreground">
                    {t(
                      POLICY_OPERATORS.find((op) => op.value === item.operator)?.labelKey ??
                        "policies.op.eq"
                    )}
                  </div>
                  <div>{formatConditionValue(item.field, item.value)}</div>
                </div>
              ) : (
                <div className="font-mono text-[13px] text-muted-foreground">{item.field}</div>
              )}
            </div>
          ))
        )}
      </div>
      <div className="mt-6 saturn-label">{t("policies.then")}</div>
      <div className="mt-3 text-[15px]">{t(decisionKey)}</div>
    </div>
  );
}
