"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { consoleQueryKey } from "@/hooks/use-console";
import {
  connectMcpServer,
  createToolSet,
  deleteToolSet,
  updateToolSet,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Agent, McpServer, McpTool, ToolSet } from "@/types";

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

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring";

function togglePicked(current: Record<string, boolean>, id: string) {
  const next = { ...current };
  if (id in next) delete next[id];
  else next[id] = false;
  return next;
}

export function ToolSetEditor({
  servers,
  toolSets,
  agents,
  toolSetLimit = 1,
  canWrite,
}: {
  servers: McpServer[];
  toolSets: ToolSet[];
  agents: Agent[];
  toolSetLimit?: number | null;
  canWrite: boolean;
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
  const [confirming, setConfirming] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [folded, setFolded] = useState<Record<string, boolean>>({});

  function load(set: ToolSet | null) {
    setEditing(set ? set.id : "new");
    setName(set?.name ?? "");
    const next: Record<string, boolean> = {};
    for (const item of set?.items ?? []) next[item.toolId] = item.approval;
    setPicked(next);
    setQuery("");
    setSelectedOnly(false);
    setFolded({});
    setConfirming(null);
  }

  const known = useMemo(() => new Set(catalog.flatMap((server) => server.tools.map((tool) => tool.id))), [catalog]);
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      catalog
        .map((server) => ({
          ...server,
          tools: server.tools.filter((tool) => {
            if (selectedOnly && !(tool.id in picked)) return false;
            if (!needle) return true;
            return `${tool.name} ${tool.description}`.toLowerCase().includes(needle);
          }),
        }))
        .filter((server) => server.tools.length > 0),
    [catalog, needle, picked, selectedOnly]
  );
  const missing = Object.keys(picked).filter((id) => !known.has(id));
  const visibleMissing = missing.filter((id) => !needle || id.toLowerCase().includes(needle));
  const pickedCount = Object.keys(picked).length;

  const save = useMutation({
    mutationFn: async () => {
      const items = Object.entries(picked).map(([tool_id, approval]) => ({ tool_id, approval }));
      const saved =
        editing && editing !== "new"
          ? await updateToolSet(editing, { name: name.trim(), items })
          : await createToolSet({ name: name.trim(), items });
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

  function applyShown(tools: McpTool[], selected: boolean) {
    setPicked((current) => {
      const next = { ...current };
      for (const tool of tools) {
          if (selected) {
          if (!(tool.id in next)) next[tool.id] = false;
        } else if (tool.id in next) {
          delete next[tool.id];
        }
      }
      return next;
    });
  }

  if (editing !== null) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!canWrite || !name.trim() || pickedCount === 0) return;
          save.mutate();
        }}
      >
        <button
          type="button"
          className="text-[13px] text-muted-foreground hover:text-foreground"
          onClick={() => setEditing(null)}
        >
          {t("tools.backToSets")}
        </button>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">
              {editing === "new" ? t("tools.newSet") : name.trim() || t("policies.edit")}
            </h1>
            <label className="mt-4 block max-w-md text-[12px] text-muted-foreground">
              {t("tools.setName")}
              <input value={name} disabled={!canWrite} onChange={(event) => setName(event.target.value)} className={cn(fieldClass, "mt-1.5")} />
            </label>
            <p className="mt-3 max-w-xl text-[13px] text-muted-foreground">{t("tools.setBoundary")}</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("tools.search")}
                className="h-10 w-full rounded-full border border-border bg-muted px-4 text-base outline-none focus:border-ring sm:max-w-sm md:h-9 md:text-[13px]"
              />
              <div className="flex gap-2">
                <FilterChip active={!selectedOnly} onClick={() => setSelectedOnly(false)}>
                  {t("tools.showAll")}
                </FilterChip>
                <FilterChip active={selectedOnly} onClick={() => setSelectedOnly(true)}>
                  {t("tools.showSelected")}
                </FilterChip>
              </div>
            </div>

            {catalog.length === 0 ? (
              <p className="mt-6 text-[13px] text-muted-foreground">{t("tools.noCatalog")}</p>
            ) : visible.length === 0 && visibleMissing.length === 0 ? (
              <p className="mt-6 text-[13px] text-muted-foreground">{t("tools.noMatch")}</p>
            ) : (
              <div className="mt-4 space-y-4">
                {visible.map((server) => {
                  const selectedHere = server.tools.filter((tool) => tool.id in picked).length;
                  const open = Boolean(needle) || !folded[server.id];
                  return (
                    <section key={server.id} className="rounded-xl border border-border bg-card">
                      <div className={cn("flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between", open && "border-b border-border")}>
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setFolded((current) => ({ ...current, [server.id]: !current[server.id] }))}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-muted"
                        >
                          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-medium">{server.name}</span>
                            <span className="mt-0.5 block text-[12px] text-muted-foreground">
                              {t("tools.count", { n: server.tools.length })} · {t("tools.selectedCount", { n: selectedHere })}
                            </span>
                          </span>
                        </button>
                        {canWrite ? (
                          <div className="flex gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => applyShown(server.tools, true)}>
                              {t("tools.selectShown")}
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => applyShown(server.tools, false)}>
                              {t("tools.clearShown")}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      {open ? (
                        <ul>
                          <ToolHeading tool={t("tools.list")} behavior={t("tools.defaultBehavior")} />
                          {server.tools.map((tool) => (
                            <ToolRow
                              key={tool.id}
                              tool={tool}
                              on={tool.id in picked}
                              approval={Boolean(picked[tool.id])}
                              allowLabel={t("tools.allow")}
                              approvalLabel={t("tools.requireApproval")}
                              disabled={!canWrite}
                              onToggle={() => canWrite && setPicked((current) => togglePicked(current, tool.id))}
                              onApproval={(approval) => canWrite && setPicked((current) => ({ ...current, [tool.id]: approval }))}
                            />
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  );
                })}
                {visibleMissing.length > 0 ? (
                  <section className="rounded-xl border border-border bg-card">
                    <div className="border-b border-border px-4 py-3 text-[13px] text-muted-foreground">{t("tools.missing")}</div>
                    <ul>
                      <ToolHeading tool={t("tools.list")} behavior={t("tools.defaultBehavior")} />
                      {visibleMissing.map((id) => (
                        <ToolRow
                          key={id}
                          tool={{ id, name: id, description: "" }}
                          on
                          approval={Boolean(picked[id])}
                          allowLabel={t("tools.allow")}
                          approvalLabel={t("tools.requireApproval")}
                          disabled={!canWrite}
                          onToggle={() => canWrite && setPicked((current) => togglePicked(current, id))}
                          onApproval={(approval) => canWrite && setPicked((current) => ({ ...current, [id]: approval }))}
                        />
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 z-10 mt-6 flex flex-col gap-3 border-t border-border bg-background/95 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted-foreground">{t("tools.selectedCount", { n: pickedCount })}</p>
          {canWrite ? (
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                {t("agents.cancel")}
              </Button>
              <Button type="submit" disabled={save.isPending || !name.trim() || pickedCount === 0}>
                {t("tools.saveSet")}
              </Button>
            </div>
          ) : null}
        </div>
        {save.isError ? <p className="pb-3 text-[13px] text-destructive">{save.error.message}</p> : null}
        {remove.isError ? <p className="pb-3 text-[13px] text-destructive">{remove.error.message}</p> : null}
      </form>
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{t("nav.mapping")}</h1>
          <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">{t("tools.setsNote")}</p>
        </div>
        {!canWrite ? null : toolSetLimit != null && toolSets.length >= toolSetLimit ? (
          <div className="w-full max-w-md sm:w-auto">
            <UpgradePrompt title={t("plan.oneSet")} />
          </div>
        ) : (
          <Button className="w-full sm:w-auto" onClick={() => load(null)} disabled={catalog.length === 0}>
            {t("tools.newSet")}
          </Button>
        )}
      </div>
      {catalog.length === 0 ? <p className="mt-3 text-[12px] text-muted-foreground">{t("tools.noCatalog")}</p> : null}
      {toolSets.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-[15px] font-medium">{t("tools.noSets")}</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">{t("tools.setsNote")}</p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {toolSets.map((set) => {
            const users = agents.filter((agent) => agent.toolSetId === set.id);
            const preview = set.items.slice(0, 6);
            const held = set.items.filter((item) => item.approval).length;
            return (
              <li key={set.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => load(set)}>
                    <div className="truncate text-[15px] font-medium">{set.name}</div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {t("tools.count", { n: set.items.length })}
                      {held > 0 ? ` · ${t("tools.approvalCount", { n: held })}` : ""}
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => load(set)}>
                      {canWrite ? t("tools.edit") : t("tools.view")}
                    </Button>
                    {canWrite && confirming === set.id ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                          {t("agents.cancel")}
                        </Button>
                        <Button variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(set.id)}>
                          {t("tools.confirmSet")}
                        </Button>
                      </>
                    ) : canWrite ? (
                      <Button variant="ghost" size="sm" onClick={() => setConfirming(set.id)}>
                        {t("tools.remove")}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {preview.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {preview.map((item) => (
                      <span key={item.toolId} className="max-w-full truncate rounded-full bg-muted px-2.5 py-1 font-mono text-[11px]">
                        {item.name}
                      </span>
                    ))}
                    {set.items.length > preview.length ? (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                        +{set.items.length - preview.length}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {users.length > 0 ? (
                  <p className="mt-3 truncate text-[12px] text-muted-foreground">
                    {t("tools.usedBy")} {users.map((agent) => agent.name).join(", ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {remove.isError ? <p className="mt-3 text-[13px] text-destructive">{remove.error.message}</p> : null}
    </section>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full border px-3 text-[13px]",
        active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ToolHeading({ tool, behavior }: { tool: string; behavior: string }) {
  return (
    <li className="hidden items-center gap-3 px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground sm:flex">
      <span className="min-w-0 flex-1">{tool}</span>
      <span className="w-[196px] text-center">{behavior}</span>
    </li>
  );
}

function ToolRow({
  tool,
  on,
  approval,
  allowLabel,
  approvalLabel,
  disabled = false,
  onToggle,
  onApproval,
}: {
  tool: McpTool;
  on: boolean;
  approval: boolean;
  allowLabel: string;
  approvalLabel: string;
  disabled?: boolean;
  onToggle: () => void;
  onApproval: (approval: boolean) => void;
}) {
  return (
    <li className={cn("flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3", on && "bg-muted/40")}>
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        disabled={disabled}
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default"
      >
        <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-foreground bg-foreground text-background" : "border-border bg-background")}>
          {on ? <Check className="size-3" /> : null}
        </span>
        <span className="min-w-0">
          <span className="block break-all font-mono text-[12px]">{tool.name}</span>
          {tool.description ? <span className="mt-0.5 line-clamp-2 block text-[12px] leading-5 text-muted-foreground">{tool.description}</span> : null}
        </span>
      </button>
      {on ? (
        <span className="inline-flex gap-1 pl-7 sm:pl-0">
          <Choice on={!approval} disabled={disabled} onClick={() => onApproval(false)}>
            {allowLabel}
          </Choice>
          <Choice on={approval} disabled={disabled} onClick={() => onApproval(true)}>
            {approvalLabel}
          </Choice>
        </span>
      ) : null}
    </li>
  );
}

function Choice({ on, disabled = false, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-7 rounded-full border px-2.5 text-[12px] disabled:cursor-default",
        on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
