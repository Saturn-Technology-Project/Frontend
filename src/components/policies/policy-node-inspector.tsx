"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { SchemaField, ToolGroup } from "@/components/policies/policy-builder-schema";
import { useEntitlements } from "@/hooks/use-entitlements";
import { fetchGroups } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { POLICY_OPERATORS } from "@/lib/policy";
import type { FlowData, FlowNode, NodeApprovalRequirement } from "@/lib/policy-graph";
import type { Agent } from "@/types";

export const inputClass =
  "mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

export function NodeInspector({
  node,
  agents,
  tools,
  groups,
  fields,
  hasTool,
  disabled,
  onChange,
  onDuplicate,
  onDelete,
}: {
  node: FlowNode;
  agents: Agent[];
  tools: string[];
  groups: ToolGroup[];
  fields: SchemaField[];
  hasTool: boolean;
  disabled: boolean;
  onChange: (patch: Partial<FlowData>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const data = node.data;
  const { groups: groupAccess } = useEntitlements();
  const orgGroups = useQuery({
    queryKey: ["groups"],
    queryFn: fetchGroups,
    enabled: groupAccess && data.kind === "decision" && data.decision === "approval",
  });
  const classification = data.classification;
  return (
    <div className="mt-3">
      {data.kind === "subject" ? (
        <div className="grid gap-1">
          {agents.map((agent) => {
            const on = (data.agentIds ?? []).includes(agent.id);
            return (
              <label key={agent.id} className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={on}
                  onChange={() => {
                    const current = data.agentIds ?? [];
                    onChange({ agentIds: on ? current.filter((id) => id !== agent.id) : current.concat(agent.id) });
                  }}
                />
                {agent.name}
              </label>
            );
          })}
          <p className="mt-2 text-[12px] text-muted-foreground">{t("policies.anyAgent")}</p>
        </div>
      ) : null}
      {data.kind === "tool" ? (
        <>
          <select aria-label={t("policies.capability")} disabled={disabled} value={data.tool ?? ""} onChange={(event) => onChange({ tool: event.target.value })} className={inputClass}>
            <option value="">{t("policies.capability")}</option>
            <ToolOptions names={tools} groups={groups} />
          </select>
          {classification ? (
            <dl className="mt-4 space-y-2 text-[12px]">
              <Meta label={t("policies.kind.tool")} value={classification.status ?? ""} />
              <Meta label={t("policies.operation")} value={classification.operation ?? ""} />
              <Meta label={t("policies.resource")} value={classification.resource ?? ""} />
              <Meta label={t("policies.risk")} value={classification.risk ?? ""} />
              <Meta label={t("policies.sideEffects")} value={classification.sideEffects ?? ""} />
              {classification.rationale ? <p className="text-muted-foreground">{classification.rationale}</p> : null}
            </dl>
          ) : null}
        </>
      ) : null}
      {data.kind === "condition" ? (
        <ConditionFields data={data} fields={fields} hasTool={hasTool} disabled={disabled} onChange={onChange} />
      ) : null}
      {data.kind === "logic" ? (
        <select aria-label={t("policies.logic")} disabled={disabled} value={data.op ?? "and"} onChange={(event) => onChange({ op: event.target.value as FlowData["op"] })} className={inputClass}>
          <option value="and">AND</option>
          <option value="or">OR</option>
          <option value="not">NOT</option>
        </select>
      ) : null}
      {data.kind === "decision" ? (
        <>
        <select aria-label={t("policies.decision")}
          disabled={disabled}
          value={data.decision ?? "deny"}
          onChange={(event) => {
            const decision = event.target.value as FlowData["decision"];
            onChange({
              decision,
              ...(decision === "approval" && !data.approvalRequirements
                ? { approvalRequirements: [{ groupId: "", requiredCount: 1 }], allowRequester: false }
                : {}),
            });
          }}
          className={inputClass}
        >
          <option value="allow">{t("policies.action.allow")}</option>
          <option value="approval">{t("policies.action.approval")}</option>
          <option value="deny">{t("policies.action.deny")}</option>
        </select>
        {groupAccess && data.decision === "approval" ? (
          <ApprovalComposer
            disabled={disabled}
            rows={data.approvalRequirements ?? [{ groupId: "", requiredCount: 1 }]}
            allowRequester={data.allowRequester ?? false}
            groups={orgGroups.data ?? []}
            onChange={onChange}
          />
        ) : null}
        </>
      ) : null}
      {data.kind === "enforcement" ? (
        <>
          <p className="text-[12px] text-muted-foreground">{t("policies.auditAlways")}</p>
          <input aria-label={t("policies.rateLimit")} disabled={disabled} value={data.rateLimit ?? ""} placeholder={t("policies.rateLimit")} onChange={(event) => onChange({ rateLimit: event.target.value })} className={inputClass} />
        </>
      ) : null}
      {disabled ? null : (
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="outline" onClick={onDuplicate}>{t("policies.duplicate")}</Button>
          <Button type="button" variant="outline" onClick={onDelete}>{t("policies.remove")}</Button>
        </div>
      )}
    </div>
  );
}

function ApprovalComposer({
  rows,
  groups,
  allowRequester,
  disabled,
  onChange,
}: {
  rows: NodeApprovalRequirement[];
  groups: { id: string; name: string }[];
  allowRequester: boolean;
  disabled: boolean;
  onChange: (patch: Partial<FlowData>) => void;
}) {
  const { t } = useI18n();
  function write(next: NodeApprovalRequirement[]) {
    onChange({ approvalRequirements: next });
  }
  return (
    <div className="mt-3 grid gap-2">
      <p className="text-[12px] text-muted-foreground">{t("policies.approvalBody")}</p>
      {rows.map((row, index) => (
        <div key={`${index}-${row.groupId}`} className="grid gap-2">
          <select
            disabled={disabled}
            value={row.groupId}
            aria-label={t("policies.approvalGroup")}
            onChange={(event) => {
              const group = groups.find((item) => item.id === event.target.value);
              write(rows.map((item, itemIndex) => (
                itemIndex === index ? { ...item, groupId: event.target.value, groupName: group?.name ?? "" } : item
              )));
            }}
            className={inputClass}
          >
            <option value="">{t("policies.approvalAnyone")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-muted-foreground">
              {t("policies.approvalCount")}
              <input
                disabled={disabled}
                type="number"
                min={1}
                max={20}
                value={row.requiredCount}
                onChange={(event) => {
                  const count = Number(event.target.value);
                  write(rows.map((item, itemIndex) => (
                    itemIndex === index ? { ...item, requiredCount: Number.isFinite(count) ? count : 1 } : item
                  )));
                }}
                className={`${inputClass} w-24`}
              />
            </label>
            {rows.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => write(rows.filter((_, itemIndex) => itemIndex !== index))}
              >
                {t("policies.removeApprovalGroup")}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || rows.length >= 10}
          onClick={() => write(rows.concat({ groupId: "", requiredCount: 1 }))}
        >
          {t("policies.addApprovalGroup")}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          disabled={disabled}
          checked={allowRequester}
          onChange={(event) => onChange({ allowRequester: event.target.checked })}
        />
        {t("policies.allowRequester")}
      </label>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ConditionFields({
  data,
  fields,
  hasTool,
  disabled,
  onChange,
}: {
  data: FlowData;
  fields: SchemaField[];
  hasTool: boolean;
  disabled: boolean;
  onChange: (patch: Partial<FlowData>) => void;
}) {
  const { t } = useI18n();
  const current = String(data.field ?? "");
  const selected = fields.find((field) => field.name === current);
  const spelled = fields.find((field) => field.name.toLowerCase() === current.toLowerCase() && field.name !== current);
  const known = new Set(fields.map((field) => field.name));

  function writeValue(raw: string) {
    const type = selected?.type;
    if ((type === "number" || type === "integer") && raw.trim() !== "" && !Number.isNaN(Number(raw))) {
      onChange({ value: type === "integer" ? Number.parseInt(raw, 10) : Number(raw) });
      return;
    }
    onChange({ value: raw });
  }

  return (
    <div className="grid gap-2">
      {fields.length ? (
        <select aria-label={t("policies.field")}
          disabled={disabled}
          value={current}
          onChange={(event) => onChange({ field: event.target.value })}
          className={inputClass}
        >
          <option value="">{t("policies.field")}</option>
          {current && !known.has(current) ? <option value={current}>{current}</option> : null}
          {fields.map((field) => (
            <option key={`${field.tool}.${field.name}`} value={field.name}>
              {field.name}
              {field.type ? ` · ${field.type}` : ""}
            </option>
          ))}
        </select>
      ) : (
        <input aria-label={t("policies.field")}
          disabled={disabled}
          value={current}
          placeholder={t("policies.field")}
          onChange={(event) => onChange({ field: event.target.value })}
          className={inputClass}
        />
      )}
      {spelled ? (
        <button type="button" disabled={disabled} className="text-left text-[12px] text-destructive" onClick={() => onChange({ field: spelled.name })}>
          {t("policies.useField", { name: spelled.name })}
        </button>
      ) : null}
      <p className="text-[12px] text-muted-foreground">
        {fields.length ? selected?.description || t("policies.fieldHint") : hasTool ? t("policies.fieldEmpty") : t("policies.connectTool")}
      </p>
      <select aria-label={t("policies.operator")} disabled={disabled} value={data.operator ?? "eq"} onChange={(event) => onChange({ operator: event.target.value })} className={inputClass}>
        {POLICY_OPERATORS.map((item) => (
          <option key={item.value} value={item.value}>{t(item.labelKey)}</option>
        ))}
      </select>
      {selected?.enumValues.length ? (
        <select aria-label={t("policies.value")} disabled={disabled} value={String(data.value ?? "")} onChange={(event) => onChange({ value: event.target.value })} className={inputClass}>
          <option value="">{t("policies.value")}</option>
          {selected.enumValues.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      ) : selected?.type === "boolean" ? (
        <select aria-label={t("policies.value")}
          disabled={disabled}
          value={data.value === true ? "true" : data.value === false ? "false" : ""}
          onChange={(event) => onChange({ value: event.target.value === "true" })}
          className={inputClass}
        >
          <option value="">{t("policies.value")}</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input aria-label={t("policies.value")}
          disabled={disabled}
          value={String(data.value ?? "")}
          placeholder={t("policies.value")}
          onChange={(event) => writeValue(event.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}

export function ToolOptions({ names, groups }: { names: string[]; groups: ToolGroup[] }) {
  const { t } = useI18n();
  if (!groups.length) {
    return names.map((tool) => (
      <option key={tool} value={tool}>{tool}</option>
    ));
  }
  const listed = new Set(groups.flatMap((group) => group.tools.map((tool) => tool.name)));
  const extra = names.filter((name) => !listed.has(name));
  return (
    <>
      {groups.map((group) => (
        <optgroup key={group.id} label={group.name || t("policies.otherServer")}>
          {group.tools.map((tool) => (
            <option key={tool.name} value={tool.name}>{tool.name}</option>
          ))}
        </optgroup>
      ))}
      {extra.map((tool) => (
        <option key={tool} value={tool}>{tool}</option>
      ))}
    </>
  );
}
