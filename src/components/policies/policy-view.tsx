"use client";

import { useState } from "react";
import { Check, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import type { Policy, PolicyRule } from "@/types";

export function PolicyView({ policy }: { policy: Policy }) {
  const { t } = useI18n();
  const [mode, setMode] = useState("visual");
  const allRules = [
    ...policy.can.map((rule) => ({ ...rule, decision: "allow" })),
    ...policy.requiresApproval.map((rule) => ({ ...rule, decision: "approval" })),
    ...policy.denied.map((rule) => ({ ...rule, decision: "deny" })),
  ];

  return (
    <div className="mx-auto w-full max-w-[680px]">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] text-muted-foreground">
            {t("policies.role")}
          </div>
          <h1 className="mt-1 text-[22px] font-medium tracking-tight">
            {policy.name}
          </h1>
        </div>
        {policy.version ? (
          <div className="text-[12px] text-muted-foreground">{policy.version}</div>
        ) : null}
      </div>

      <Tabs
        value={mode}
        onValueChange={(value) => {
          if (value) setMode(value);
        }}
        className="mt-8"
      >
        <TabsList variant="line">
          <TabsTrigger value="visual">{t("policies.visual")}</TabsTrigger>
          <TabsTrigger value="advanced">{t("policies.advanced")}</TabsTrigger>
          <TabsTrigger value="yaml">{t("policies.yaml")}</TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="mt-8 space-y-8">
          <PolicyBlock
            label={t("policies.who")}
            items={policy.who.map((name) => ({
              key: name,
              label: name,
            }))}
          />
          <PolicyBlock
            label={t("policies.can")}
            items={ruleItems(policy.can)}
            icon="allow"
          />
          <PolicyBlock
            label={t("policies.requiresApproval")}
            items={ruleItems(policy.requiresApproval)}
            icon="approval"
          />
          <PolicyBlock
            label={t("policies.denied")}
            items={ruleItems(policy.denied)}
            icon="deny"
          />
        </TabsContent>

        <TabsContent value="advanced" className="mt-8">
          <p className="text-[13px] leading-6 text-muted-foreground">
            {t("policies.advancedBody")}
          </p>
          <ul className="mt-5 divide-y divide-border rounded-md border border-border bg-card text-[13px]">
            {allRules.length === 0 ? (
              <li className="px-4 py-3 text-muted-foreground">{t("policies.noRules")}</li>
            ) : (
              allRules.map((rule) => (
                <li
                  key={rule.key}
                  className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3"
                >
                  <span>
                    {rule.label}
                    {rule.detail ? (
                      <span className="ml-2 font-mono text-muted-foreground">
                        {rule.detail}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {rule.decision}
                  </span>
                </li>
              ))
            )}
          </ul>
        </TabsContent>

        <TabsContent value="yaml" className="mt-8">
          <pre className="overflow-auto rounded-md border border-border bg-card p-4 font-mono text-[12px] leading-6 text-foreground">
            {policy.yaml}
          </pre>
        </TabsContent>
      </Tabs>

      <div className="mt-10">
        <Button variant="outline" disabled>
          {t("policies.edit")}
        </Button>
      </div>
    </div>
  );
}

function ruleItems(rules: PolicyRule[]) {
  return rules.map((rule) => ({
    key: rule.key,
    label: rule.label ?? rule.key,
    detail: rule.detail,
  }));
}

function PolicyBlock({
  label,
  items,
  icon,
}: {
  label: string;
  items: { key: string; label: string; detail?: string }[];
  icon?: "allow" | "approval" | "deny";
}) {
  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <ul className="mt-3 space-y-2 border-t border-border pt-4">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2.5 text-[15px]">
            {icon === "allow" ? (
              <Check className="size-3.5 text-success" />
            ) : icon === "deny" ? (
              <X className="size-3.5 text-destructive" />
            ) : icon === "approval" ? (
              <Circle className="size-3 text-warning" />
            ) : null}
            <span>{item.label}</span>
            {item.detail ? (
              <span className="ml-auto font-mono text-[13px] text-muted-foreground">
                {item.detail}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
