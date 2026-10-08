"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { useUpdateAgent } from "@/hooks/use-console";
import {
  AUTONOMY_LEVELS,
  CUSTOM_MODEL,
  MODEL_PROVIDERS,
  RESPONSE_STYLES,
  catalogModels,
  isCustomModel,
  newKnowledgeId,
  PROVIDER_BASE_URLS,
  runtimeLabel,
} from "@/lib/agent-config";
import { useI18n } from "@/lib/i18n";
import type { AgentUpdateBody } from "@/lib/api";
import type {
  Agent,
  AgentAutonomy,
  AgentKnowledgeSource,
  AgentProvider,
  AgentResponseStyle,
  AgentWallet,
  ConsoleData,
} from "@/types";

const inputClass =
  "mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring disabled:opacity-50";
const textareaClass =
  "mt-2 w-full resize-y rounded-md border border-border bg-background px-3 py-3 text-[14px] leading-6 outline-none focus:border-ring disabled:opacity-50";

export const CONFIG_TABS = [
  "overview",
  "behavior",
  "tools",
  "knowledge",
  "model",
  "limits",
] as const;

export type ConfigTab = (typeof CONFIG_TABS)[number];

function SaveBar({
  disabled,
  saving,
  status,
  onSave,
}: {
  disabled?: boolean;
  saving: boolean;
  status: "idle" | "error" | "saved" | "pushed";
  onSave: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-6 flex items-center gap-4">
      <Button type="button" disabled={disabled || saving} onClick={onSave}>
        {saving ? t("agents.config.saving") : t("agents.config.save")}
      </Button>
      {status === "error" ? (
        <p className="text-[13px] text-destructive">{t("common.requestFailed")}</p>
      ) : null}
      {status === "pushed" ? (
        <p className="text-[13px] text-muted-foreground">{t("agents.config.pushed")}</p>
      ) : null}
      {status === "saved" ? (
        <p className="text-[13px] text-muted-foreground">
          {t("agents.config.savedOffline")}
        </p>
      ) : null}
    </div>
  );
}

function ChoiceList<T extends string>({
  name,
  value,
  options,
  disabled,
  onChange,
}: {
  name: string;
  value: T;
  options: { id: T; label: string }[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <ul className="mt-2 space-y-1.5">
      {options.map((option) => (
        <li key={option.id}>
          <label className="flex items-center gap-2.5 text-[13px]">
            <input
              type="radio"
              name={name}
              checked={value === option.id}
              disabled={disabled}
              onChange={() => onChange(option.id)}
            />
            {option.label}
          </label>
        </li>
      ))}
    </ul>
  );
}

function useConfigSave(agentId: string) {
  const update = useUpdateAgent();
  const [status, setStatus] = useState<"idle" | "error" | "saved" | "pushed">("idle");

  async function save(body: AgentUpdateBody) {
    setStatus("idle");
    try {
      const result = await update.mutateAsync({ id: agentId, body });
      setStatus(result.pushed ? "pushed" : "saved");
    } catch {
      setStatus("error");
    }
  }

  return { save, saving: update.isPending, status };
}

export function BehaviorPanel({
  agent,
  canWrite,
}: {
  agent: Agent;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const { save, saving, status } = useConfigSave(agent.id);
  const [editing, setEditing] = useState(!agent.settings.instructions);
  const [instructions, setInstructions] = useState(agent.settings.instructions);
  const [responseStyle, setResponseStyle] = useState<AgentResponseStyle>(
    agent.settings.responseStyle
  );
  const [autonomy, setAutonomy] = useState<AgentAutonomy>(agent.settings.autonomy);

  return (
    <div>
      <SectionLabel>{t("agents.config.instructions")}</SectionLabel>
      {editing ? (
        <textarea
          value={instructions}
          disabled={!canWrite}
          onChange={(event) => setInstructions(event.target.value)}
          rows={10}
          className={textareaClass}
        />
      ) : (
        <pre className="mt-3 whitespace-pre-wrap font-sans text-[14px] leading-7 text-foreground">
          {instructions || "—"}
        </pre>
      )}
      {canWrite ? (
        <button
          type="button"
          className="mt-3 text-[13px] text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => setEditing((current) => !current)}
        >
          {t("agents.config.editInstructions")}
        </button>
      ) : null}

      <div className="mt-10">
        <SectionLabel>{t("agents.config.responseStyle")}</SectionLabel>
        <ChoiceList
          name={`${agent.id}-style`}
          value={responseStyle}
          disabled={!canWrite}
          onChange={setResponseStyle}
          options={RESPONSE_STYLES.map((id) => ({
            id,
            label: t(`agents.config.${id}`),
          }))}
        />
      </div>

      <div className="mt-10">
        <SectionLabel>{t("agents.config.autonomy")}</SectionLabel>
        <ChoiceList
          name={`${agent.id}-autonomy`}
          value={autonomy}
          disabled={!canWrite}
          onChange={setAutonomy}
          options={AUTONOMY_LEVELS.map((id) => ({
            id,
            label: t(
              id === "suggest_only"
                ? "agents.config.suggestOnly"
                : id === "execute_when_allowed"
                  ? "agents.config.executeWhenAllowed"
                  : "agents.config.fullyAutonomous"
            ),
          }))}
        />
        <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">
          {t("agents.config.autonomyNote")}
        </p>
      </div>

      {canWrite ? (
        <SaveBar
          saving={saving}
          status={status}
          onSave={() =>
            void save({
              settings: {
                instructions,
                response_style: responseStyle,
                autonomy,
              },
            })
          }
        />
      ) : null}
    </div>
  );
}

export function ToolsPanel({
  agent,
  data,
  canWrite,
}: {
  agent: Agent;
  data: ConsoleData | undefined;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const { save, saving, status } = useConfigSave(agent.id);
  const sets = data?.toolSets ?? [];
  const appMcp = data?.appMcp;
  const linked = (appMcp?.attachments[agent.id] ?? [])
    .map((id) => appMcp?.servers.find((server) => server.id === id))
    .filter((server) => server != null);
  const [toolSetId, setToolSetId] = useState(agent.toolSetId ?? "");
  const selected = sets.find((item) => item.id === toolSetId) ?? null;
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; tools: { name: string; approval: boolean }[] }>();
    for (const item of selected?.items ?? []) {
      const key = item.serverName || item.serverId || "mcp";
      const group = map.get(key) ?? { name: item.serverName || key, tools: [] };
      group.tools.push({ name: item.name, approval: item.approval });
      map.set(key, group);
    }
    return [...map.values()];
  }, [selected]);

  return (
    <div>
      <SectionLabel>{t("agents.config.mcpTools")}</SectionLabel>
      <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">
        {t("agents.config.toolsNote")}
      </p>
      <label className="mt-6 block max-w-sm text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {t("agents.config.toolSet")}
        <select
          value={toolSetId}
          disabled={!canWrite}
          onChange={(event) => setToolSetId(event.target.value)}
          className={inputClass}
        >
          <option value="">{t("agents.config.selectToolSet")}</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name}
            </option>
          ))}
        </select>
      </label>
      {selected == null ? (
        <p className="mt-6 text-[13px] text-muted-foreground">{t("agents.config.noTools")}</p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <div key={group.name}>
              <div className="text-[13px] font-medium">{group.name}</div>
              <ul className="mt-2 divide-y divide-border border border-border">
                {group.tools.map((tool) => (
                  <li key={tool.name} className="flex items-center justify-between gap-4 px-3 py-2.5 text-[13px]">
                    <span className="font-mono text-[12px]">{tool.name}</span>
                    {tool.approval ? (
                      <span className="text-[12px] text-muted-foreground">{t("agents.config.needsApproval")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {canWrite ? (
        <SaveBar
          saving={saving}
          status={status}
          onSave={() => void save({ tool_set_id: toolSetId || null })}
        />
      ) : null}

      <div className="mt-10">
        <SectionLabel>{t("agents.config.appMcp")}</SectionLabel>
        <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">
          {t("agents.config.appMcpNote")}
        </p>
        {linked.length === 0 ? (
          <p className="mt-6 text-[13px] text-muted-foreground">{t("agents.config.appMcpEmpty")}</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {linked.map((server) => (
              <li key={server.id}>
                <div className="text-[13px] font-medium">{server.name}</div>
                <div className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground">{server.url}</div>
                {server.tools.length > 0 ? (
                  <ul className="mt-2 divide-y divide-border border border-border">
                    {server.tools.map((tool) => (
                      <li key={tool.toolId} className="px-3 py-2.5 font-mono text-[12px]">
                        {tool.toolId}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function KnowledgePanel({
  agent,
  canWrite,
}: {
  agent: Agent;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const { save, saving, status } = useConfigSave(agent.id);
  const [sources, setSources] = useState<AgentKnowledgeSource[]>(agent.settings.knowledge);
  const [name, setName] = useState("");

  function addSource(event: FormEvent) {
    event.preventDefault();
    const label = name.trim();
    if (!label) return;
    setSources((current) => [
      ...current,
      { id: newKnowledgeId(), name: label, kind: "document", enabled: true },
    ]);
    setName("");
  }

  return (
    <div>
      <SectionLabel>{t("agents.config.sources")}</SectionLabel>
      <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">
        {t("agents.config.knowledgeNote")}
      </p>
      {sources.length === 0 ? (
        <p className="mt-6 text-[13px] text-muted-foreground">
          {t("agents.config.noSources")}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border border border-border">
          {sources.map((source) => (
            <li key={source.id}>
              <label className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
                <input
                  type="checkbox"
                  disabled={!canWrite}
                  checked={source.enabled}
                  onChange={() =>
                    setSources((current) =>
                      current.map((item) =>
                        item.id === source.id
                          ? { ...item, enabled: !item.enabled }
                          : item
                      )
                    )
                  }
                />
                <span>{source.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {canWrite ? (
        <form onSubmit={addSource} className="mt-6 flex items-end gap-3">
          <label className="block min-w-0 flex-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("agents.config.documents")}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("agents.config.sourcePlaceholder")}
              className={inputClass}
            />
          </label>
          <Button type="submit" variant="outline" disabled={!name.trim()}>
            {t("agents.config.addSource")}
          </Button>
        </form>
      ) : null}
      {canWrite ? (
        <SaveBar
          saving={saving}
          status={status}
          onSave={() => void save({ settings: { knowledge: sources } })}
        />
      ) : null}
    </div>
  );
}

export function ModelPanel({
  agent,
  canWrite,
}: {
  agent: Agent;
  canWrite: boolean;
}) {
  const { t } = useI18n();
  const { save, saving, status } = useConfigSave(agent.id);
  const [provider, setProvider] = useState<AgentProvider>(agent.settings.provider);
  const [model, setModel] = useState(agent.settings.model);
  const [baseUrl, setBaseUrl] = useState(agent.settings.baseUrl);
  const [temperature, setTemperature] = useState(String(agent.settings.temperature));
  const [maxOutput, setMaxOutput] = useState(String(agent.settings.maxOutput));
  const catalog = catalogModels(provider);
  const customId = isCustomModel(provider, model);

  function onProvider(next: AgentProvider) {
    setProvider(next);
    const options = catalogModels(next);
    if (next === "custom") return;
    if (!options.includes(model)) setModel(options[0] ?? "");
  }

  return (
    <div>
      <SectionLabel>{t("agents.config.model")}</SectionLabel>
      <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">
        {t("agents.config.modelNote")}
      </p>
      <div className="mt-6 grid max-w-sm gap-5">
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("agents.config.provider")}
          <select
            value={provider}
            disabled={!canWrite}
            onChange={(event) => onProvider(event.target.value as AgentProvider)}
            className={inputClass}
          >
            {MODEL_PROVIDERS.map((item) => (
              <option key={item.id} value={item.id}>
                {t(`agents.config.providers.${item.id}`)}
              </option>
            ))}
          </select>
        </label>
        {provider !== "custom" && catalog.length > 0 ? (
          <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("agents.model")}
            <select
              value={customId ? CUSTOM_MODEL : model}
              disabled={!canWrite}
              onChange={(event) => {
                const next = event.target.value;
                if (next === CUSTOM_MODEL) {
                  if (!customId) setModel("");
                  return;
                }
                setModel(next);
              }}
              className={inputClass}
            >
              {catalog.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value={CUSTOM_MODEL}>{t("agents.config.customModel")}</option>
            </select>
          </label>
        ) : null}
        {customId ? (
          <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("agents.config.modelId")}
            <input
              value={model}
              disabled={!canWrite}
              onChange={(event) => setModel(event.target.value)}
              placeholder={catalog[0] || t("agents.config.modelId")}
              className={inputClass}
            />
          </label>
        ) : null}
        {provider === "custom" ? (
          <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("agents.config.baseUrl")}
            <input
              value={baseUrl}
              disabled={!canWrite}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://"
              className={inputClass}
            />
            <span className="mt-2 block normal-case tracking-normal text-[12px] leading-5 text-muted-foreground">
              {t("agents.config.baseUrlHint")}
            </span>
          </label>
        ) : (
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {t("agents.config.baseUrl")}
            </div>
            <div className="mt-2 font-mono text-[12px] leading-5">
              {PROVIDER_BASE_URLS[provider]}
            </div>
            <p className="mt-2 max-w-md text-[12px] leading-5 text-muted-foreground">
              {t("agents.config.sharedKeyHint")}
            </p>
          </div>
        )}
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("agents.config.temperature")}
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            disabled={!canWrite}
            onChange={(event) => setTemperature(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("agents.config.maxOutput")}
          <input
            type="number"
            min={1}
            max={128000}
            step={1}
            value={maxOutput}
            disabled={!canWrite}
            onChange={(event) => setMaxOutput(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      {canWrite ? (
        <SaveBar
          disabled={!model.trim() || (provider === "custom" && !baseUrl.trim())}
          saving={saving}
          status={status}
          onSave={() =>
            void save({
              model: model.trim(),
              settings: {
                provider,
                model: model.trim(),
                base_url: provider === "custom" ? baseUrl.trim() : PROVIDER_BASE_URLS[provider],
                temperature: Number(temperature),
                max_output: Number(maxOutput),
              },
            })
          }
        />
      ) : null}
    </div>
  );
}

export function RuntimePanel({
  agent,
  data,
  canAdmin,
}: {
  agent: Agent;
  data: ConsoleData | undefined;
  canAdmin: boolean;
}) {
  const { t } = useI18n();
  const { save, saving, status } = useConfigSave(agent.id);
  const runtimes = useMemo(() => {
    const ids = new Set(
      (data?.agents ?? [])
        .map((item) => item.runtimeId)
        .filter((item): item is string => Boolean(item))
    );
    if (agent.runtimeId) ids.add(agent.runtimeId);
    return [...ids];
  }, [agent.runtimeId, data?.agents]);
  const [environment, setEnvironment] = useState(
    agent.settings.environment || ""
  );
  const [runtimeId, setRuntimeId] = useState(agent.runtimeId || "");
  const [region, setRegion] = useState(agent.settings.region);

  return (
    <div>
      <SectionLabel>{t("agents.runtime")}</SectionLabel>
      <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">
        {canAdmin ? t("agents.config.runtimeNote") : t("agents.config.adminOnly")}
      </p>
      <div className="mt-6 grid max-w-sm gap-5">
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("agents.config.environment")}
          <input
            value={environment}
            disabled={!canAdmin}
            onChange={(event) => setEnvironment(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("agents.runtime")}
          {runtimes.length > 0 ? (
            <select
              value={runtimeId}
              disabled={!canAdmin}
              onChange={(event) => setRuntimeId(event.target.value)}
              className={inputClass}
            >
              {runtimes.map((id) => (
                <option key={id} value={id}>
                  {runtimeLabel(id) || id}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={runtimeId}
              disabled={!canAdmin}
              onChange={(event) => setRuntimeId(event.target.value)}
              className={inputClass}
            />
          )}
        </label>
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("agents.config.region")}
          <input
            value={region}
            disabled={!canAdmin}
            onChange={(event) => setRegion(event.target.value)}
            className={inputClass}
          />
        </label>
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("agents.config.runtimeStatus")}
          </div>
          <div className="mt-2 text-[13px]">
            {agent.connected ? t("agents.config.healthy") : t("agents.offline")}
          </div>
        </div>
      </div>
      {canAdmin ? (
        <SaveBar
          saving={saving}
          status={status}
          onSave={() =>
            void save({
              runtime_id: runtimeId || null,
              settings: { environment, region },
            })
          }
        />
      ) : null}
    </div>
  );
}

export function LimitsPanel({
  agent,
  wallet,
  canAdmin,
}: {
  agent: Agent;
  wallet?: AgentWallet;
  canAdmin: boolean;
}) {
  const { t } = useI18n();
  const { save, saving, status } = useConfigSave(agent.id);
  const [concurrent, setConcurrent] = useState(String(agent.settings.maxConcurrentRuns));
  const [toolCalls, setToolCalls] = useState(String(agent.settings.maxToolCalls));
  const [timeout, setTimeoutMinutes] = useState(String(agent.settings.maxRuntimeMinutes));
  const [daily, setDaily] = useState(wallet?.dailySpendLimit ?? "10.00");
  const [perTx, setPerTx] = useState(wallet?.perTxLimit ?? "1.00");

  return (
    <div>
      <SectionLabel>{t("agents.config.execution")}</SectionLabel>
      {!canAdmin ? (
        <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">
          {t("agents.config.adminOnly")}
        </p>
      ) : null}
      <div className="mt-6 grid max-w-sm gap-5">
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("agents.config.concurrentRuns")}
          <input
            type="number"
            min={1}
            value={concurrent}
            disabled={!canAdmin}
            onChange={(event) => setConcurrent(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("agents.config.toolCallsPerRun")}
          <input
            type="number"
            min={1}
            value={toolCalls}
            disabled={!canAdmin}
            onChange={(event) => setToolCalls(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("agents.config.runtimeTimeout")}
          <input
            type="number"
            min={1}
            value={timeout}
            disabled={!canAdmin}
            onChange={(event) => setTimeoutMinutes(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {wallet ? (
        <div className="mt-10">
          <SectionLabel>{t("agents.config.financial")}</SectionLabel>
          <div className="mt-6 grid max-w-sm gap-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {t("agents.config.agentWallet")}
              </div>
              <div className="mt-2 text-[13px]">
                {wallet.network} · {wallet.asset}
              </div>
            </div>
            <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {t("agents.config.dailySpend")}
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={daily}
                disabled={!canAdmin}
                onChange={(event) => setDaily(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {t("agents.config.perTransaction")}
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={perTx}
                disabled={!canAdmin}
                onChange={(event) => setPerTx(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        </div>
      ) : null}

      <p className="mt-6 max-w-md text-[12px] leading-5 text-muted-foreground">
        {t("agents.config.limitsNote")}
      </p>
      {canAdmin ? (
        <SaveBar
          saving={saving}
          status={status}
          onSave={() =>
            void save({
              daily_spend_limit: daily,
              per_tx_limit: perTx,
              settings: {
                max_concurrent_runs: Number(concurrent),
                max_tool_calls: Number(toolCalls),
                max_runtime_minutes: Number(timeout),
              },
            })
          }
        />
      ) : null}
    </div>
  );
}
