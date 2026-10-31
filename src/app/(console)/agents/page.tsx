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
import { profileIdentity } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { detailPanelClass } from "@/components/layout/mobile-nav";
import { apiOrigin } from "@/lib/ws";
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
  const agents = (data?.agents ?? []).filter((agent) => agent.origin === "saturn_mcp");
  const personal = org?.kind === "personal" || (org?.kind !== "organization" && org?.plan !== "enterprise");
  const selected = agents.find((agent) => agent.id === selectedId) ?? null;
  const toolSets = data?.toolSets ?? [];

  useEffect(() => {
    if (search.get("connect") === "1") setConnecting(true);
  }, [search]);

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="flex min-h-full">
        <div className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{t("agents.title")}</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">{t("agents.subtitle")}</p>
            </div>
            <Button
              type="button"
              className="w-full sm:w-auto"
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
            <>
            <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card md:hidden">
              {agents.map((agent) => {
                const copy = agentCopy(locale, agent.id, agent);
                const toolSet = toolSets.find((set) => set.id === agent.toolSetId) ?? null;
                return (
                  <li key={agent.id}>
                    <button
                      type="button"
                      className={cn("flex w-full flex-col gap-1 px-4 py-3.5 text-left", selected?.id === agent.id && "bg-muted")}
                      onClick={() => {
                        setConnecting(false);
                        setSelectedId(agent.id);
                      }}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[12px]">
                          {copy.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="truncate">{copy.name}</span>
                        {agent.registeredUserName ? (
                          <span className="truncate text-[12px] font-normal text-muted-foreground">· {agent.registeredUserName}</span>
                        ) : null}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {toolSet?.name || "—"} · {t("agents.tools")} {toolSet?.items.length ?? 0}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {agent.lastHeartbeatAt ? relativeTime(agent.lastHeartbeatAt, locale) : t("agents.noLastCall")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 hidden overflow-hidden rounded-xl border border-border bg-card md:block">
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
                          <button type="button" aria-pressed={selected?.id === agent.id} className="flex items-center gap-2 text-left font-medium">
                            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[11px]">
                              {copy.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="truncate">{copy.name}</span>
                            {agent.registeredUserName ? (
                              <span className="truncate text-[12px] font-normal text-muted-foreground">· {agent.registeredUserName}</span>
                            ) : null}
                          </button>
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
            </>
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
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(apiOrigin());
  }, []);
  const endpoint = origin ? `${origin}/mcp` : "";
  const profileHeader = identity ? `X-Saturn-Profile: ${identity}` : "";
  const config = endpoint
    ? JSON.stringify(
        {
          type: "http",
          url: endpoint,
          headers: { "X-Saturn-Profile": identity },
        },
        null,
        2
      )
    : "";
  const packet = [
    `${t("agents.endpoint")}\n${endpoint}`,
    `${t("agents.transport")}\n${t("agents.transportValue")}`,
    `${t("agents.signIn")}\n${t("agents.signInValue")}`,
    `${t("agents.scope")}\n${t("agents.scopeValue")}`,
    `${t("agents.profileHeader")}\n${profileHeader}`,
    `${t("agents.clientConfig")}\n${config}`,
  ].join("\n\n");
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    if (!endpoint) return;
    await navigator.clipboard.writeText(packet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <aside className={detailPanelClass}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <h2 className="text-[16px] font-medium">{t("agents.connect")}</h2>
        <button type="button" className="inline-flex h-11 shrink-0 items-center px-1 text-[13px] text-muted-foreground hover:text-foreground" onClick={onClose}>
          {t("marketplace.close")}
        </button>
      </div>
      <div className="px-5 py-5">
        <p className="text-[13px] text-muted-foreground">{t("agents.connectNote")}</p>
        <Field label={t("agents.endpoint")} value={endpoint} hint={t("agents.endpointHint")} />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Field label={t("agents.transport")} value={t("agents.transportValue")} mono={false} />
          <Field label={t("agents.signIn")} value={t("agents.signInValue")} mono={false} />
        </div>
        <Field label={t("agents.scope")} value={t("agents.scopeValue")} />
        <Field label={t("agents.profileHeader")} value={profileHeader} />
        <p className="mt-2 text-[12px] text-muted-foreground">
          {personal ? t("agents.identityPersonal") : t("agents.identityOrganization")}
        </p>
        <Field label={t("agents.clientConfig")} value={config} />
        <Button className="mt-5" type="button" variant="outline" disabled={!endpoint} onClick={() => void copyAll()}>
          {copied ? t("agents.copied") : t("agents.copy")}
        </Button>
      </div>
    </aside>
  );
}

function Field({
  label,
  value,
  hint,
  mono = true,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className={hint || mono ? "mt-5" : ""}>
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-2 whitespace-pre-wrap break-all rounded-lg border border-border bg-background px-3 py-2",
          mono ? "font-mono text-[12px]" : "text-[13px]"
        )}
      >
        {value || "—"}
      </div>
      {hint ? <p className="mt-2 text-[12px] text-muted-foreground">{hint}</p> : null}
    </div>
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
  const matched = useMemo(() => eventsFor(agent.id, events), [agent.id, events]);
  const requests = matched.filter((event) => event.event === "tool_requested");
  const counts = useMemo(() => {
    const usage = new Map<string, number>();
    for (const event of matched) {
      if (event.event !== "tool_requested" || !event.tool) continue;
      usage.set(event.tool, (usage.get(event.tool) ?? 0) + 1);
    }
    return [...usage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [matched]);
  const max = counts[0]?.[1] ?? 1;
  const servers = [...new Set((toolSet?.items ?? []).map((item) => item.serverName).filter(Boolean))];

  return (
    <aside className={detailPanelClass}>
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
        <button type="button" className="inline-flex h-11 shrink-0 items-center px-1 text-[13px] text-muted-foreground hover:text-foreground" onClick={onClose}>
          {t("marketplace.close")}
        </button>
      </div>

      <div className="px-5 py-5">
        <p className="text-[13px] text-muted-foreground">{copy.description || t("agents.viaMcp")}</p>

        <h3 className="mt-6 text-[13px] font-medium">{t("agents.registeredBy")}</h3>
        <p className="mt-1 text-[13px]">
          {agent.registeredUserName || "—"}
          {agent.registeredUserEmail ? <span className="text-muted-foreground"> · {agent.registeredUserEmail}</span> : null}
        </p>
        <Identity label={t("agents.clientId")} value={agent.clientId || ""} />
        <Identity label={t("agents.agentId")} value={agent.id} />

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
        <div className="text-[22px] font-medium tracking-tight">{requests.length}</div>
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

function Identity({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="mt-4">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-mono text-[12px]">{value}</div>
    </div>
  );
}

function Node({ label }: { label: string }) {
  return <span className="inline-flex max-w-full truncate rounded-lg border border-border bg-background px-2.5 py-1 text-[12px]">{label}</span>;
}

function auditNo(event: ActivityEvent) {
  const value = event.raw?.audit_no;
  return typeof value === "number" || typeof value === "string" ? String(value) : "";
}

// Only the request carries the agent; the policy, approval and execution events of the same call share its audit number.
function eventsFor(agentId: string, events: ActivityEvent[]) {
  const calls = new Set(
    events
      .filter((event) => event.event === "tool_requested" && event.actorId === agentId)
      .map(auditNo)
      .filter(Boolean)
  );
  return events.filter((event) => event.actorId === agentId || calls.has(auditNo(event)));
}
