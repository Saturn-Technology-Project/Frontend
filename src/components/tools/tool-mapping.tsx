"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { consoleQueryKey } from "@/hooks/use-console";
import {
  connectMcpServer,
  createToolSet,
  deleteToolSet,
  updateAgent,
  updateToolSet,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Agent, McpServer, ToolSet } from "@/types";

const inputClass =
  "mt-2 h-8 w-full border border-border bg-background px-2 text-[13px] font-normal normal-case tracking-normal text-foreground";

export function McpConnectForm() {
  const { t } = useI18n();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const connect = useMutation({
    mutationFn: () =>
      connectMcpServer({
        name: name.trim(),
        endpoint: endpoint.trim(),
        authorization: token.trim() || undefined,
      }),
    onSuccess: async () => {
      setName("");
      setEndpoint("");
      setToken("");
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !endpoint.trim()) return;
    connect.mutate();
  }

  return (
    <form onSubmit={submit} className="mt-8 max-w-[720px] border border-border p-4">
      <SectionLabel>{t("tools.connect")}</SectionLabel>
      <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">
        {t("tools.connectNote")}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("tools.name")}
          <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </label>
        <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("tools.endpoint")}
          <input
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            placeholder="https://"
            className={inputClass}
          />
        </label>
      </div>
      <label className="mt-4 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {t("tools.token")}
        <input
          type="password"
          value={token}
          autoComplete="off"
          placeholder={t("tools.tokenOptional")}
          onChange={(event) => setToken(event.target.value)}
          className={inputClass}
        />
      </label>
      <Button type="submit" className="mt-4" disabled={connect.isPending || !name.trim() || !endpoint.trim()}>
        {t("tools.connectAction")}
      </Button>
      {connect.isError ? (
        <p className="mt-3 text-[13px] text-destructive">{connect.error.message}</p>
      ) : null}
    </form>
  );
}

export function ToolSetEditor({
  servers,
  toolSets,
  agents,
}: {
  servers: McpServer[];
  toolSets: ToolSet[];
  agents: Agent[];
}) {
  const { t } = useI18n();
  const client = useQueryClient();
  const catalog = useMemo(
    () =>
      servers
        .map((server) => ({
          id: server.id,
          name: server.name,
          tools: server.catalog ?? [],
        }))
        .filter((server) => server.tools.length > 0),
    [servers]
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  function load(set: ToolSet | null) {
    setEditing(set ? set.id : "new");
    setName(set?.name ?? "");
    const next: Record<string, boolean> = {};
    for (const item of set?.items ?? []) next[item.toolId] = item.approval;
    setPicked(next);
    setAgentIds(set ? agents.filter((agent) => agent.toolSetId === set.id).map((agent) => agent.id) : []);
  }

  const save = useMutation({
    mutationFn: async () => {
      const items = Object.entries(picked).map(([tool_id, approval]) => ({ tool_id, approval }));
      const saved =
        editing && editing !== "new"
          ? await updateToolSet(editing, { name: name.trim(), items })
          : await createToolSet({ name: name.trim(), items });
      const selected = new Set(agentIds);
      await Promise.all(
        agents.map((agent) => {
          const has = agent.toolSetId === saved.id;
          const want = selected.has(agent.id);
          if (want && !has) return updateAgent(agent.id, { tool_set_id: saved.id });
          if (!want && has) return updateAgent(agent.id, { tool_set_id: null });
          return Promise.resolve(null);
        })
      );
      return saved;
    },
    onSuccess: async () => {
      setEditing(null);
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteToolSet(id),
    onSuccess: async () => {
      setConfirming(null);
      setEditing(null);
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });

  return (
    <section className="max-w-[720px]">
      <SectionLabel>{t("tools.sets")}</SectionLabel>
      <p className="mt-3 max-w-md text-[12px] leading-5 text-muted-foreground">{t("tools.setsNote")}</p>
      {toolSets.length === 0 && editing === null ? (
        <p className="mt-6 text-[13px] text-muted-foreground">{t("tools.noSets")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {toolSets.map((set) => {
            const users = agents.filter((agent) => agent.toolSetId === set.id).map((agent) => agent.name);
            return (
              <li key={set.id} className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[14px] font-medium">{set.name}</div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {t("tools.count", { n: set.items.length })}
                      {users.length ? ` · ${t("tools.usedBy")} ${users.join(", ")}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => load(set)}>
                      {t("policies.edit")}
                    </Button>
                    {confirming === set.id ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(set.id)}
                      >
                        {t("tools.confirmRemove")}
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirming(set.id)}>
                        {t("tools.remove")}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing === null ? (
        <Button variant="outline" className="mt-4" onClick={() => load(null)} disabled={catalog.length === 0}>
          {t("tools.newSet")}
        </Button>
      ) : (
        <form
          className="mt-6 border border-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || Object.keys(picked).length === 0) return;
            save.mutate();
          }}
        >
          <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("tools.setName")}
            <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </label>
          {catalog.length === 0 ? (
            <p className="mt-4 text-[13px] text-muted-foreground">{t("tools.noCatalog")}</p>
          ) : (
            <div className="mt-6 space-y-6">
              {catalog.map((server) => (
                <div key={server.id}>
                  <div className="text-[13px] font-medium">{server.name}</div>
                  <ul className="mt-2 divide-y divide-border border border-border">
                    {server.tools.map((tool) => {
                      const on = tool.id in picked;
                      return (
                        <li key={tool.id} className="flex items-center justify-between gap-4 px-3 py-2.5 text-[13px]">
                          <label className="flex min-w-0 items-center gap-3">
                            <input
                              type="checkbox"
                              className="size-3.5 shrink-0"
                              checked={on}
                              onChange={() =>
                                setPicked((current) => {
                                  const next = { ...current };
                                  if (tool.id in next) delete next[tool.id];
                                  else next[tool.id] = false;
                                  return next;
                                })
                              }
                            />
                            <span className="truncate font-mono text-[12px]">{tool.name}</span>
                          </label>
                          <label className="flex shrink-0 items-center gap-2 text-[12px] text-muted-foreground">
                            <input
                              type="checkbox"
                              className="size-3.5 shrink-0"
                              disabled={!on}
                              checked={Boolean(picked[tool.id])}
                              onChange={() =>
                                setPicked((current) => ({ ...current, [tool.id]: !current[tool.id] }))
                              }
                            />
                            {t("tools.needsApproval")}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6">
            <div className="text-[13px] font-medium">{t("tools.assign")}</div>
            <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{t("tools.assignNote")}</p>
            {agents.length === 0 ? (
              <p className="mt-3 text-[13px] text-muted-foreground">{t("tools.noAgents")}</p>
            ) : (
              <ul className="mt-3 divide-y divide-border border border-border">
                {agents.map((agent) => {
                  const on = agentIds.includes(agent.id);
                  const other = toolSets.find((set) => set.id === agent.toolSetId && set.id !== editing);
                  return (
                    <li key={agent.id} className="flex items-center justify-between gap-4 px-3 py-2.5 text-[13px]">
                      <label className="flex min-w-0 items-center gap-3">
                        <input
                          type="checkbox"
                          className="size-3.5 shrink-0"
                          checked={on}
                          onChange={() =>
                            setAgentIds((current) =>
                              current.includes(agent.id)
                                ? current.filter((id) => id !== agent.id)
                                : [...current, agent.id]
                            )
                          }
                        />
                        <span className="truncate">{agent.name}</span>
                      </label>
                      {other && !on ? (
                        <span className="shrink-0 text-[12px] text-muted-foreground">
                          {t("tools.onAnotherSet", { name: other.name })}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button type="submit" disabled={save.isPending || !name.trim() || Object.keys(picked).length === 0}>
              {t("tools.saveSet")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              {t("agents.cancel")}
            </Button>
          </div>
          {save.isError ? <p className="mt-3 text-[13px] text-destructive">{save.error.message}</p> : null}
          {remove.isError ? <p className="mt-3 text-[13px] text-destructive">{remove.error.message}</p> : null}
        </form>
      )}
      {catalog.length === 0 && editing === null ? (
        <p className="mt-3 text-[12px] text-muted-foreground">{t("tools.noCatalog")}</p>
      ) : null}
    </section>
  );
}
