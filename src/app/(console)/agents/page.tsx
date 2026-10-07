"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QueryGate } from "@/components/layout/query-gate";
import { Button } from "@/components/ui/button";
import { useConsole, useDeleteAgent, useUpdateAgent } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { relativeTime } from "@/lib/format";
import { agentCopy, useI18n } from "@/lib/i18n";
import { profileIdentity, saturnMcpAgents } from "@/lib/profile";
import { cn } from "@/lib/utils";
import type { ActivityEvent, Agent, ToolSet } from "@/types";

export default function AgentsPage() {
  const { t, locale } = useI18n();
  const search = useSearchParams();
  const { data, isPending, isError } = useConsole();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canAdmin = canAccess(permissions, "team", "write");
  const canAssign = canAccess(permissions, "agents", "write");
  const user = useAuthStore((state) => state.user);
  const org = useAuthStore((state) => state.org);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const identity =
    user && org
      ? profileIdentity({
          userId: user.id,
          organizationId: org.id,
          kind: org.kind,
          plan: org.plan,
        })
      : "";
  const agents = saturnMcpAgents(data?.agents ?? [], identity);
  const personal = org?.kind === "personal" || (org?.kind !== "organization" && org?.plan !== "enterprise");
  const selected = agents.find((agent) => agent.id === selectedId) ?? null;
  const toolSets = data?.toolSets ?? [];

  useEffect(() => {
    if (search.get("connect") === "1") setConnecting(true);
  }, [search]);

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="flex min-h-full">
        <div className="min-w-0 flex-1 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-semibold tracking-tight">{t("agents.title")}</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">{t("agents.subtitle")}</p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setConnecting(true);
              }}
            >
              {t("agents.connect")}
            </Button>
          </div>

          {agents.length === 0 ? (
            <p className="mt-10 text-[13px] text-muted-foreground">{t("agents.empty")}</p>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-border text-[12px] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("agents.name")}</th>
                    <th className="px-4 py-3 font-medium">{t("agents.sets")}</th>
                    <th className="px-4 py-3 font-medium">{t("agents.tools")}</th>
                    <th className="px-4 py-3 font-medium">{t("agents.lastCalled")}</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => {
                    const copy = agentCopy(locale, agent.id, agent);
                    const toolSet = toolSets.find((set) => set.id === agent.toolSetId) ?? null;
                    return (
                      <tr
                        key={agent.id}
                        className={cn("cursor-pointer border-b border-border last:border-0", selected?.id === agent.id && "bg-muted")}
                        onClick={() => {
                          setConnecting(false);
                          setSelectedId(agent.id);
                        }}
                      >
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2 font-medium">
                            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[11px]">
                              {copy.name.slice(0, 1).toUpperCase()}
                            </span>
                            {copy.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{toolSet?.name || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{toolSet?.items.length ?? 0}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {agent.lastHeartbeatAt ? relativeTime(agent.lastHeartbeatAt, locale) : t("agents.noLastCall")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {connecting ? (
          <ConnectPanel
            identity={identity}
            personal={personal}
            onClose={() => setConnecting(false)}
          />
        ) : null}
        {selected ? (
          <AgentPanel
            agent={selected}
            toolSets={toolSets}
            events={data?.events ?? []}
            canAssign={canAssign}
            canAdmin={canAdmin}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>
    </QueryGate>
  );
}

function ConnectPanel({
  identity,
  personal,
  onClose,
}: {
  identity: string;
  personal: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copyIdentity() {
    if (!identity) return;
    await navigator.clipboard.writeText(identity);
    setCopied(true);
  }

  return (
    <aside className="sticky top-0 flex h-[calc(100vh-3.5rem)] w-[340px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <h2 className="text-[16px] font-medium">{t("agents.connect")}</h2>
        <button type="button" className="text-[12px] text-muted-foreground hover:text-foreground" onClick={onClose}>
          {t("marketplace.close")}
        </button>
      </div>
      <div className="px-5 py-5">
        <p className="text-[13px] text-muted-foreground">{t("agents.connectNote")}</p>
        <div className="mt-5 text-[12px] text-muted-foreground">{t("agents.identity")}</div>
        <div className="mt-2 break-all rounded-lg border border-border bg-background px-3 py-2 font-mono text-[12px]">
          {identity || "—"}
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">
          {personal ? t("agents.identityPersonal") : t("agents.identityOrganization")}
        </p>
        <Button className="mt-4" type="button" variant="outline" disabled={!identity} onClick={() => void copyIdentity()}>
          {copied ? t("agents.copied") : t("agents.copy")}
        </Button>
      </div>
    </aside>
  );
}

function AgentPanel({
  agent,
  toolSets,
  events,
  canAssign,
  canAdmin,
  onClose,
}: {
  agent: Agent;
  toolSets: ToolSet[];
  events: ActivityEvent[];
  canAssign: boolean;
  canAdmin: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const remove = useDeleteAgent();
  const assign = useUpdateAgent();
  const [confirming, setConfirming] = useState(false);
  const copy = agentCopy(locale, agent.id, agent);
  const toolSet = toolSets.find((set) => set.id === agent.toolSetId) ?? null;
  const matched = useMemo(() => eventsFor(toolSet, events), [toolSet, events]);
  const counts = useMemo(() => {
    const usage = new Map<string, number>();
    for (const event of matched) {
      if (!event.tool) continue;
      usage.set(event.tool, (usage.get(event.tool) ?? 0) + 1);
    }
    return [...usage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [matched]);
  const max = counts[0]?.[1] ?? 1;
  const servers = [...new Set((toolSet?.items ?? []).map((item) => item.serverName).filter(Boolean))];

  return (
    <aside className="sticky top-0 flex h-[calc(100vh-3.5rem)] w-[340px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-medium">
            {copy.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[16px] font-medium">{copy.name}</div>
            <div className="truncate text-[12px] text-muted-foreground">
              {agent.lastHeartbeatAt ? t("agents.lastCall", { time: relativeTime(agent.lastHeartbeatAt, locale) }) : t("agents.noLastCall")}
            </div>
          </div>
        </div>
        <button type="button" className="text-[12px] text-muted-foreground hover:text-foreground" onClick={onClose}>
          {t("marketplace.close")}
        </button>
      </div>

      <div className="px-5 py-5">
        <p className="text-[13px] text-muted-foreground">{copy.description || t("agents.viaMcp")}</p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <h3 className="text-[13px] font-medium">{t("agents.sets")}</h3>
          <Link href="/tools/mapping" className="text-[12px] text-muted-foreground hover:text-foreground">
            {t("agents.manageSets")}
          </Link>
        </div>
        {canAssign ? (
          <label className="mt-2 block text-[12px] text-muted-foreground">
            <select
              value={agent.toolSetId ?? ""}
              disabled={assign.isPending}
              onChange={(event) =>
                assign.mutate({ id: agent.id, body: { tool_set_id: event.target.value || null } })
              }
              className="mt-1 h-8 w-full border border-border bg-background px-2 text-[13px] text-foreground"
            >
              <option value="">{t("agents.config.selectToolSet")}</option>
              {toolSets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <p className="mt-2 text-[12px] text-muted-foreground">{t("agents.assignNote")}</p>
        {toolSet ? (
          <div className="mt-2 rounded-lg border border-border px-3 py-2">
            <div className="text-[13px] font-medium">{toolSet.name}</div>
            <p className="mt-1 text-[12px] text-muted-foreground">{toolSet.description || t("agents.toolsLead")}</p>
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-muted-foreground">{t("agents.noSet")}</p>
        )}
        {assign.isError ? <p className="mt-2 text-[13px] text-destructive">{assign.error.message}</p> : null}

        <h3 className="mt-6 text-[13px] font-medium">{t("agents.tools")}</h3>
        {toolSet && toolSet.items.length > 0 ? (
          <ul className="mt-2 divide-y divide-border">
            {toolSet.items.map((item) => (
              <li key={item.toolId} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px]">{item.name}</span>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                    {item.approval ? t("agents.permissionApproval") : t("agents.permissionCall")}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.serverName || "—"}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-muted-foreground">{t("agents.noSet")}</p>
        )}

        <h3 className="mt-6 text-[13px] font-medium">{t("agents.usage")}</h3>
        <div className="mt-1 text-[12px] text-muted-foreground">{t("agents.calls")}</div>
        <div className="text-[22px] font-medium tracking-tight">{matched.length}</div>
        {counts.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">{t("agents.noUsage")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {counts.map(([name, count]) => (
              <li key={name}>
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="truncate">{name}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-secondary">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(8, (count / max) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-6 text-[13px] font-medium">{t("agents.access")}</h3>
        <div className="mt-2 space-y-2">
          <Node label={copy.name} />
          <div className="pl-3 text-[12px] text-muted-foreground">↓</div>
          <Node label={toolSet?.name || t("agents.noSet")} />
          {servers.length > 0 ? (
            <>
              <div className="pl-3 text-[12px] text-muted-foreground">↓</div>
              <div className="flex flex-wrap gap-2">
                {servers.map((name) => (
                  <Node key={name} label={name} />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <h3 className="mt-6 text-[13px] font-medium">{t("agents.activity")}</h3>
        {matched.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">{t("agents.noActivity")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {matched.slice(0, 6).map((event) => (
              <li key={event.id} className="py-2">
                <div className="truncate text-[13px]">{event.tool || event.title}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {relativeTime(event.at, locale)}
                  {event.result ? ` · ${event.result}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canAdmin ? (
          <div className="mt-6">
            {confirming ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>{t("agents.cancel")}</Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(agent.id, { onSuccess: onClose })}
                >
                  {t("agents.confirmRemove")}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>{t("agents.remove")}</Button>
            )}
            {remove.isError ? <p className="mt-2 text-[13px] text-destructive">{remove.error.message}</p> : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Node({ label }: { label: string }) {
  return <span className="inline-flex max-w-full truncate rounded-lg border border-border bg-background px-2.5 py-1 text-[12px]">{label}</span>;
}

function eventsFor(toolSet: ToolSet | null, events: ActivityEvent[]) {
  if (!toolSet) return [];
  const names = new Set(toolSet.items.map((item) => item.name));
  return events.filter((event) => event.tool && names.has(event.tool));
}
