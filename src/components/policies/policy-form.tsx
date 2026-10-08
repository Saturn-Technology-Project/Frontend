"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import {
  emptyRule,
  PolicyRuleBuilder,
  type DraftRule,
} from "@/components/policies/policy-rule-builder";
import { useI18n } from "@/lib/i18n";
import { coerceConditionValue, POLICY_ENVIRONMENTS } from "@/lib/policy";
import type { PolicyWrite } from "@/lib/api";
import type { Agent, Policy } from "@/types";

const inputClass =
  "mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

function toDraft(policy?: Policy): {
  name: string;
  description: string;
  agentIds: string[];
  tool: string;
  environment: string;
  rules: DraftRule[];
} {
  if (!policy) {
    return {
      name: "",
      description: "",
      agentIds: [],
      tool: "",
      environment: "production",
      rules: [emptyRule()],
    };
  }
  return {
    name: policy.name,
    description: policy.description,
    agentIds: policy.agentIds,
    tool: policy.tools[0] ?? "",
    environment: policy.environment || "production",
    rules:
      policy.rules.length > 0
        ? policy.rules.map((rule) => ({
            key: rule.id,
            decision: rule.decision,
            conditions:
              rule.conditions.length > 0
                ? rule.conditions.map((item) => ({
                    field: item.field,
                    operator: item.operator,
                    value: String(item.value ?? ""),
                  }))
                : [{ field: "amount", operator: "gt", value: "" }],
          }))
        : [emptyRule()],
  };
}

export function PolicyForm({
  policy,
  agents,
  tools,
  submitting,
  error,
  onSubmit,
}: {
  policy?: Policy;
  agents: Agent[];
  tools: string[];
  submitting: boolean;
  error: boolean;
  onSubmit: (body: PolicyWrite) => Promise<void>;
}) {
  const { t } = useI18n();
  const initial = useMemo(() => toDraft(policy), [policy]);
  const [form, setForm] = useState(initial);

  function toggleAgent(id: string) {
    setForm((current) => ({
      ...current,
      agentIds: current.agentIds.includes(id)
        ? current.agentIds.filter((item) => item !== id)
        : [...current.agentIds, id],
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const tool = form.tool.trim();
    await onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      environment: form.environment,
      agent_ids: form.agentIds,
      tool: tool || undefined,
      rules: form.rules.map((rule) => ({
        tool,
        decision: rule.decision,
        conditions: rule.conditions
          .filter((item) => item.field.trim())
          .map((item) => ({
            field: item.field.trim(),
            operator: item.operator,
            value: coerceConditionValue(item.value.replace(/^\$/, "")),
          })),
      })),
    });
  }

  return (
    <form className="max-w-[680px]" onSubmit={(event) => void submit(event)}>
      <SectionLabel>{t("policies.create")}</SectionLabel>
      <p className="mt-3 max-w-md text-[13px] text-muted-foreground">
        {t("policies.createBody")}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4">
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("policies.name")}
          <input
            required
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder={t("policies.namePlaceholder")}
            className={inputClass}
          />
        </label>
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("policies.description")}
          <input
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder={t("policies.descriptionPlaceholder")}
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-10">
        <SectionLabel>{t("policies.appliesTo")}</SectionLabel>
        <div className="mt-4 grid gap-4 border-t border-border pt-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {t("policies.agents")}
            </div>
            <ul className="mt-2 divide-y divide-border border border-border">
              {agents.map((agent) => (
                <li key={agent.id}>
                  <label className="flex items-center gap-3 px-3 py-3 text-[13px]">
                    <input
                      type="checkbox"
                      checked={form.agentIds.includes(agent.id)}
                      onChange={() => toggleAgent(agent.id)}
                    />
                    <span>{agent.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            {form.agentIds.length === 0 ? (
              <p className="mt-2 text-[12px] text-muted-foreground">{t("policies.allAgents")}</p>
            ) : null}
          </div>
          <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("policies.tools")}
            {tools.length > 0 ? (
              <select
                value={form.tool}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tool: event.target.value }))
                }
                className={inputClass}
                required
              >
                <option value="">{t("policies.tools")}</option>
                {tools.map((tool) => (
                  <option key={tool} value={tool}>
                    {tool}
                  </option>
                ))}
                {form.tool && !tools.includes(form.tool) ? (
                  <option value={form.tool}>{form.tool}</option>
                ) : null}
              </select>
            ) : (
              <input
                required
                value={form.tool}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tool: event.target.value }))
                }
                placeholder={t("policies.toolPlaceholder")}
                className={inputClass}
              />
            )}
          </label>
          <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("policies.environment")}
            <select
              value={form.environment}
              onChange={(event) =>
                setForm((current) => ({ ...current, environment: event.target.value }))
              }
              className={inputClass}
            >
              {POLICY_ENVIRONMENTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-10">
        <SectionLabel>{t("policies.rules")}</SectionLabel>
        <div className="mt-4 space-y-3 border-t border-border pt-5">
          {form.rules.map((rule, index) => (
            <PolicyRuleBuilder
              key={rule.key}
              rule={rule}
              canRemove={form.rules.length > 1}
              onChange={(next) =>
                setForm((current) => ({
                  ...current,
                  rules: current.rules.map((item, currentIndex) =>
                    currentIndex === index ? next : item
                  ),
                }))
              }
              onRemove={() =>
                setForm((current) => ({
                  ...current,
                  rules: current.rules.filter((_, currentIndex) => currentIndex !== index),
                }))
              }
            />
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setForm((current) => ({ ...current, rules: [...current.rules, emptyRule()] }))}
          >
            {t("policies.addRule")}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-[12px] text-destructive">{t("common.requestFailed")}</p>
      ) : null}

      <Button
        type="submit"
        className="mt-8"
        disabled={submitting || !form.name.trim() || !form.tool.trim()}
      >
        {submitting
          ? policy
            ? t("policies.saving")
            : t("policies.creating")
          : policy
            ? t("policies.save")
            : t("policies.create")}
      </Button>
    </form>
  );
}
