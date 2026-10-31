"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useConsole } from "@/hooks/use-console";
import { exportActivity } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { decryptHeldEnvelope, openSealedActivity } from "@/lib/payload-crypto";
import type { PayloadEnvelope } from "@/lib/api";
import { formatClock, formatDayLabel, relativeTime } from "@/lib/format";
import { eventActor, eventText, useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ActivityEvent, ActorKind, McpServer, Policy, ToolSet } from "@/types";

const kindLabel: Record<ActorKind, string> = {
  human: "activity.kindHuman",
  agent: "activity.kindAgent",
  tool: "activity.kindTool",
  saturn: "activity.kindSaturn",
  wallet: "activity.kindWallet",
};

const chainEvents = new Set([
  "tool_requested",
  "policy_evaluated",
  "approval_requested",
  "approval_granted",
  "approval_rejected",
  "approval_expired",
  "tool_executed",
  "wallet_evaluated",
  "x402_payment_required",
  "x402_settled",
  "x402_failed",
]);

type Chain = {
  id: string;
  at: string;
  no: number;
  events: ActivityEvent[];
};

function matchesQuery(event: ActivityEvent, query: string, title: string, actor: string) {
  if (!query) return true;
  return [title, actor, event.tool, event.result, event.detail, event.event, event.id, event.runId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function resultTone(result: string) {
  const value = result.toLowerCase();
  if (/(fail|denied|reject|error)/.test(value)) return "bad";
  if (/(pending|required|requested)/.test(value)) return "wait";
  if (/(allow|approv|complet|settled|success|grant|pass|\bok\b)/.test(value)) return "ok";
  return "plain";
}

function textOf(value: unknown) {
  if (typeof value === "string") return value;
  return "";
}

function serverOf(event: ActivityEvent, toolSets: ToolSet[], servers: McpServer[]) {
  const stored = textOf(event.raw?.server_name).trim();
  if (stored) return stored;
  const name = event.tool || "";
  if (!name) return "";
  for (const set of toolSets) {
    const item = set.items.find((entry) => entry.name === name && entry.serverName);
    if (item?.serverName) return item.serverName;
  }
  return servers.find((server) => server.catalog.some((tool) => tool.name === name) || server.tools.includes(name))?.name ?? "";
}

const stepOrder: Record<string, number> = {
  tool_requested: 0,
  policy_evaluated: 1,
  approval_requested: 2,
  approval_granted: 3,
  approval_rejected: 3,
  wallet_evaluated: 4,
  x402_payment_required: 5,
  x402_settled: 6,
  x402_failed: 6,
  tool_executed: 7,
};

function eventTime(event: { at: string }) {
  return new Date(event.at).getTime();
}

type TimeRange = "all" | "today" | "yesterday" | "7d" | "30d";

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function matchesTime(at: string, range: TimeRange) {
  if (range === "all") return true;
  const time = eventTime({ at });
  const today = startOfLocalDay(new Date());
  const day = 86_400_000;
  if (range === "today") return time >= today;
  if (range === "yesterday") return time >= today - day && time < today;
  if (range === "7d") return time >= today - 6 * day;
  return time >= today - 29 * day;
}

function chainServer(chain: Chain, toolSets: ToolSet[], servers: McpServer[]) {
  return chain.events.map((event) => serverOf(event, toolSets, servers)).find(Boolean) || "";
}

function chainAgent(chain: Chain) {
  const request = chain.events.find((event) => event.event === "tool_requested") ?? chain.events[0];
  return { id: request.actorId || request.actor, event: request };
}

function auditNo(event: ActivityEvent) {
  const value = event.raw?.audit_no;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function idsOf(event: ActivityEvent) {
  const raw = event.raw ?? {};
  return {
    action: event.actionId || textOf(raw.action_id),
    run: event.runId || textOf(raw.run_id),
    tool: event.tool || "",
    no: auditNo(event),
  };
}

function buildChains(events: ActivityEvent[]): Chain[] {
  const sorted = [...events].sort((a, b) => {
    const delta = eventTime(a) - eventTime(b);
    if (delta !== 0) return delta;
    return (stepOrder[a.event ?? ""] ?? 9) - (stepOrder[b.event ?? ""] ?? 9);
  });
  const drafts: { id: string; tool: string; action: string; run: string; no: number | null; events: ActivityEvent[]; closed: boolean }[] = [];
  const singles: Chain[] = [];

  for (const event of sorted) {
    if (!event.event || !chainEvents.has(event.event)) {
      singles.push({ id: event.id, at: event.at, no: 0, events: [event] });
      continue;
    }
    const ids = idsOf(event);
    const at = eventTime(event);
    let draft = ids.no != null ? drafts.find((item) => item.no === ids.no) : undefined;
    if (!draft && ids.action) draft = drafts.find((item) => item.action === ids.action);
    if (!draft && ids.run && ids.tool) {
      draft = drafts.find((item) => !item.closed && item.run === ids.run && item.tool === ids.tool);
    }
    if (!draft && ids.tool) {
      const candidates = drafts.filter((item) => {
        if (item.closed || item.tool !== ids.tool) return false;
        if (item.events.some((step) => step.event === event.event)) return false;
        const last = eventTime(item.events[item.events.length - 1]);
        return at >= last && at - last <= 60_000;
      });
      draft = candidates.sort((a, b) => eventTime(b.events[b.events.length - 1]) - eventTime(a.events[a.events.length - 1]))[0];
    }
    if (!draft) {
      draft = { id: event.id, tool: ids.tool, action: ids.action, run: ids.run, no: ids.no, events: [], closed: false };
      drafts.push(draft);
    }
    draft.events.push(event);
    if (!draft.action && ids.action) draft.action = ids.action;
    if (!draft.run && ids.run) draft.run = ids.run;
    if (!draft.tool && ids.tool) draft.tool = ids.tool;
    if (draft.no == null && ids.no != null) draft.no = ids.no;
    if (event.event === "tool_executed") draft.closed = true;
  }

  const chains = [...singles, ...drafts.map((draft) => ({
    id: draft.id,
    at: draft.events[draft.events.length - 1].at,
    no: draft.no ?? 0,
    events: draft.events,
  }))];
  const used = new Set(chains.map((chain) => chain.no).filter((no) => no > 0));
  let next = 1;
  for (const chain of [...chains].sort((a, b) => eventTime(a) - eventTime(b))) {
    if (chain.no > 0) continue;
    while (used.has(next)) next += 1;
    chain.no = next;
    used.add(next);
    next += 1;
  }
  return chains.sort((a, b) => eventTime(b) - eventTime(a));
}

function hasBody(value: unknown) {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonText(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return text;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return text;
  }
}

function serverBody(value: unknown): unknown {
  if (!hasBody(value) || typeof value === "string") return undefined;
  let body: unknown = value;
  if (isRecord(body) && "result" in body && ("jsonrpc" in body || "id" in body)) body = body.result;
  if (!isRecord(body)) return hasBody(body) ? body : undefined;
  if (hasBody(body.structuredContent)) return body.structuredContent;
  if (Array.isArray(body.content)) {
    const texts = body.content.flatMap((item) => (isRecord(item) && typeof item.text === "string" ? [item.text] : []));
    if (texts.length === 1) return parseJsonText(texts[0]);
    if (texts.length > 1) return texts.map(parseJsonText);
  }
  return body;
}

function pretty(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function outcomeKey(result: string | undefined) {
  const value = (result ?? "").toLowerCase();
  if (value === "completed" || value === "success") return "activity.success";
  if (value === "allow" || value === "allowed") return "activity.allowed";
  if (value === "deny" || value === "denied") return "activity.denied";
  if (value === "requested") return "activity.requested";
  if (value === "pending" || value === "approval_required") return "activity.pending";
  if (value === "approved") return "approvals.approved";
  if (value === "rejected") return "approvals.rejected";
  return "";
}

function executedSuccessfully(events: ActivityEvent[]) {
  return events.some((event) => event.event === "tool_executed" && /^(completed|success)$/i.test(event.result || ""));
}

function chainBadge(events: ActivityEvent[]) {
  const released = events.some((event) => event.event === "approval_granted" && (event.result || "").toLowerCase() === "approved");
  const reviewed = released || events.some((event) => event.event === "approval_granted" || event.event === "approval_rejected");
  const executed = events.some((event) => event.event === "tool_executed");
  if (reviewed && executedSuccessfully(events)) return { key: "activity.confirmed", tone: "ok" as const };
  if (executed) return null;
  if (released) return { key: "activity.awaitingResubmit", tone: "wait" as const };
  return null;
}

function policyBasis(event: ActivityEvent, policies: Policy[], none: string) {
  const raw = event.raw ?? {};
  const stored = textOf(raw.policy_name).trim();
  if (stored) return stored;
  const id = textOf(raw.policy_id).trim();
  if (!id) return none;
  return policies.find((policy) => policy.id === id)?.name || id;
}

function Line({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="text-[13px] leading-6">
      <span className="text-muted-foreground">{label}</span>
      <span className="mx-1.5 text-muted-foreground">·</span>
      <span className="break-all">{value}</span>
    </p>
  );
}

function Body({ label, value }: { label: string; value: unknown }) {
  if (!hasBody(value)) return null;
  return (
    <div className="mt-2">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <pre className="mt-1 max-h-96 overflow-auto whitespace-pre rounded-lg bg-muted px-3 py-2 font-mono text-[11px] leading-5">{pretty(value)}</pre>
    </div>
  );
}

export function activityOutcome(result: string | undefined) {
  return outcomeKey(result);
}

export function activityChains(events: ActivityEvent[]) {
  return buildChains(events);
}

export function chainPreview(
  chain: Chain,
  toolSets: ToolSet[],
  servers: McpServer[],
  locale: Locale,
  t: (path: string, vars?: Record<string, string | number>) => string,
) {
  const head = chain.events[chain.events.length - 1];
  const request = chain.events.find((event) => event.event === "tool_requested");
  const executed = [...chain.events].reverse().find((event) => event.event === "tool_executed");
  const server = serverOf(head, toolSets, servers) || chain.events.map((event) => serverOf(event, toolSets, servers)).find(Boolean) || "";
  const decided = [...chain.events].reverse().find((event) => event.event === "approval_granted" || event.event === "approval_rejected");
  const outcome = executed?.result || decided?.result || head.result;
  const badge = chainBadge(chain.events);
  return {
    id: chain.id,
    no: chain.no,
    at: chain.at,
    headline: head.tool ? (server ? `${head.tool} · ${server}` : head.tool) : eventText(locale, head.titleKey, head.title),
    initiator: request ? eventActor(locale, request) : eventActor(locale, chain.events[0]),
    outcomeText: badge ? t(badge.key) : outcomeKey(outcome) ? t(outcomeKey(outcome)) : outcome || "",
    tone: badge?.tone ?? (outcome ? resultTone(outcome) : "plain"),
    steps: chain.events.length,
    kindKey: kindLabel[head.actorKind],
    runId: chain.events.map((event) => event.runId || textOf(event.raw?.run_id)).find(Boolean) || "",
    reason: typeof head.raw?.reason === "string" ? head.raw.reason : "",
  };
}

export function AuditLog({
  events,
  urlQuery,
  focusEvent = "",
  detailed = false,
}: {
  events: ActivityEvent[];
  urlQuery: string;
  focusEvent?: string;
  detailed?: boolean;
}) {
  const { t, locale } = useI18n();
  const { data } = useConsole();
  const policies = data?.policies ?? [];
  const toolSets = useMemo(() => data?.toolSets ?? [], [data?.toolSets]);
  const servers = useMemo(() => data?.mcpServers ?? [], [data?.mcpServers]);
  const [query, setQuery] = useState(urlQuery);
  const [shownUrlQuery, setShownUrlQuery] = useState(urlQuery);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [serverFilter, setServerFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openBody, setOpenBody] = useState<string | null>(null);
  const [exportError, setExportError] = useState("");

  // A new ?q= in the address replaces what is typed in the search box.
  if (urlQuery !== shownUrlQuery) {
    setShownUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const needle = detailed ? query.trim().toLowerCase() : "";
  const built = useMemo(() => buildChains(events), [events]);

  // The chain holding the linked event opens once when it shows up, and is scrolled to.
  const focusChain = focusEvent
    ? built.find((item) => item.id === focusEvent || item.events.some((event) => event.id === focusEvent || event.runId === focusEvent))
    : undefined;
  const focusId = focusChain?.id ?? null;
  const [openedFocus, setOpenedFocus] = useState<string | null>(null);
  if (detailed && focusId && focusId !== openedFocus) {
    setOpenedFocus(focusId);
    setOpenId(focusId);
  }
  useEffect(() => {
    if (focusId) document.getElementById(`audit-${focusId}`)?.scrollIntoView({ block: "center" });
  }, [focusId]);
  const serverOptions = useMemo(() => {
    return [...new Set(built.map((chain) => chainServer(chain, toolSets, servers)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [built, servers, toolSets]);
  const agentOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const chain of built) {
      const agent = chainAgent(chain);
      if (agent.id) names.set(agent.id, eventActor(locale, agent.event));
    }
    return [...names.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [built, locale]);
  const chains = useMemo(() => {
    return built.filter((chain) => {
      if (!matchesTime(chain.at, timeRange)) return false;
      if (serverFilter && chainServer(chain, toolSets, servers) !== serverFilter) return false;
      if (agentFilter && chainAgent(chain).id !== agentFilter) return false;
      return chain.events.some((event) => {
        const server = serverOf(event, toolSets, servers);
        return matchesQuery(event, needle, eventText(locale, event.titleKey, event.title), [eventActor(locale, event), server].filter(Boolean).join(" "));
      });
    });
  }, [agentFilter, built, locale, needle, serverFilter, servers, timeRange, toolSets]);

  const groups = useMemo(() => {
    const map = new Map<string, Chain[]>();
    for (const chain of chains) {
      const day = formatDayLabel(chain.at, locale);
      const list = map.get(day) ?? [];
      list.push(chain);
      map.set(day, list);
    }
    return [...map.entries()];
  }, [chains, locale]);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{t("nav.audit")}</h1>
          <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
            {detailed ? t("activity.subtitle") : t("plan.activityBasic")}
          </p>
        </div>
        {detailed ? (
          <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
            <input aria-label={t("activity.search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("activity.search")}
              className="h-10 w-full rounded-full border border-border bg-muted px-4 text-base outline-none focus:border-ring md:h-9 md:text-[13px] lg:w-[280px]"
            />
            <button
              type="button"
              className="h-9 self-start rounded-lg border border-border px-3 text-[13px] hover:bg-muted lg:self-end"
              onClick={() => {
                setExportError("");
                void exportActivity().then(
                  (rows) => {
                    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "activity.json";
                    link.click();
                    URL.revokeObjectURL(url);
                  },
                  () => setExportError(t("common.requestFailed"))
                );
              }}
            >
              {t("activity.export")}
            </button>
          </div>
        ) : null}
      </div>
      {exportError ? <p className="mt-2 text-[13px] text-destructive">{exportError}</p> : null}

      {detailed ? <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          aria-label={t("activity.time")}
          value={timeRange}
          onChange={(event) => setTimeRange(event.target.value as TimeRange)}
          className="h-10 rounded-full border border-border bg-muted px-3 text-base outline-none focus:border-ring md:h-9 md:text-[13px]"
        >
          <option value="all">{t("activity.allTime")}</option>
          <option value="today">{t("activity.today")}</option>
          <option value="yesterday">{t("activity.yesterday")}</option>
          <option value="7d">{t("activity.last7")}</option>
          <option value="30d">{t("activity.last30")}</option>
        </select>
        <select
          aria-label={t("activity.mcpServer")}
          value={serverFilter}
          onChange={(event) => setServerFilter(event.target.value)}
          className="h-10 rounded-full border border-border bg-muted px-3 text-base outline-none focus:border-ring md:h-9 md:text-[13px]"
        >
          <option value="">{t("activity.allServers")}</option>
          {serverOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select
          aria-label={t("activity.agent")}
          value={agentFilter}
          onChange={(event) => setAgentFilter(event.target.value)}
          className="h-10 rounded-full border border-border bg-muted px-3 text-base outline-none focus:border-ring md:h-9 md:text-[13px]"
        >
          <option value="">{t("activity.allAgents")}</option>
          {agentOptions.map((agent) => (
            <option key={agent.id} value={agent.id}>{agent.name}</option>
          ))}
        </select>
      </div> : null}
      <p className="mt-3 text-[12px] text-muted-foreground">{t("activity.count", { n: chains.length })}</p>

      {events.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-[15px] font-medium">{t("activity.empty")}</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">{t("activity.subtitle")}</p>
        </div>
      ) : chains.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-[15px] font-medium">{t("activity.noMatch")}</p>
          <button
            type="button"
            className="mt-3 text-[13px] text-muted-foreground underline hover:text-foreground"
            onClick={() => {
              setQuery("");
              setTimeRange("all");
              setServerFilter("");
              setAgentFilter("");
            }}
          >
            {t("activity.clear")}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map(([day, dayChains]) => (
            <section key={day} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-[13px] font-medium">{day}</h2>
                <span className="text-[12px] text-muted-foreground">{dayChains.length}</span>
              </div>
              <ul>
                {dayChains.map((chain) => {
                  const preview = chainPreview(chain, toolSets, servers, locale, t);
                  const open = detailed && openId === preview.id;
                  return (
                    <li id={`audit-${preview.id}`} key={preview.id} className="border-b border-border last:border-0">
                      <button
                        type="button"
                        aria-expanded={detailed ? open : undefined}
                        onClick={() => {
                          if (detailed) setOpenId(open ? null : preview.id);
                        }}
                        className={cn("flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/50", open && "bg-muted/40")}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-[12px] font-medium text-foreground">#{preview.no}</span>
                              <span className="font-mono text-[11px] text-muted-foreground">{formatClock(preview.at)}</span>
                            </span>
                            {preview.outcomeText ? (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px]",
                                  preview.tone === "ok" && "bg-success/10 text-success",
                                  preview.tone === "bad" && "bg-destructive/10 text-destructive",
                                  preview.tone === "wait" && "bg-warning/15 text-warning",
                                  preview.tone === "plain" && "bg-muted text-foreground"
                                )}
                              >
                                {preview.outcomeText}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block truncate text-[14px] font-medium">{preview.headline}</span>
                          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                            {preview.initiator}
                            {detailed && preview.steps > 1 ? ` · ${t("activity.steps", { n: preview.steps })}` : ` · ${t(preview.kindKey)}`}
                            {` · ${relativeTime(preview.at, locale)}`}
                          </span>
                          {preview.runId ? (
                            <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                              {t("activity.runId")} {preview.runId}
                            </span>
                          ) : null}
                          {!detailed && preview.reason ? (
                            <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{preview.reason}</span>
                          ) : null}
                        </span>
                        {detailed ? (
                          <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                        ) : null}
                      </button>
                      {open ? (
                        <div className="px-4 pb-4">
                          <ol className="ml-2 border-l border-border">
                            {chain.events.map((event, index) => (
                              <li key={event.id} className="relative pb-5 pl-5 last:pb-0">
                                <span className={cn("absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-card", index === chain.events.length - 1 ? "bg-foreground" : "bg-muted-foreground")} />
                                <ChainStep
                                  event={event}
                                  step={index + 1}
                                  server={serverOf(event, toolSets, servers)}
                                  policies={policies}
                                  openBody={openBody}
                                  onToggle={(key) => setOpenBody(openBody === key ? null : key)}
                                />
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ChainStep({
  event,
  step,
  server,
  policies,
  openBody,
  onToggle,
}: {
  event: ActivityEvent;
  step: number;
  server: string;
  policies: Policy[];
  openBody: string | null;
  onToggle: (key: string) => void;
}) {
  const { t, locale } = useI18n();
  const orgId = useAuthStore((state) => state.org?.id) ?? "";
  const [opened, setOpened] = useState<Record<string, unknown> | null>(null);
  const [requestView, setRequestView] = useState<unknown>(undefined);
  const [responseView, setResponseView] = useState<unknown>(undefined);
  const [revealFailed, setRevealFailed] = useState(false);
  const title = eventText(locale, event.titleKey, event.title);
  const actor = eventActor(locale, event);
  const raw = event.raw ?? {};
  const rawRequest = requestView !== undefined ? requestView : raw.raw_request ?? raw.arguments ?? event.payload?.parameters;
  const rawResponse = responseView !== undefined ? responseView : serverBody(raw.raw_response ?? raw.server_result);
  const sealed = raw.sealed === true || isRecord(raw.envelope);
  const requestKey = `${event.id}:request`;
  const responseKey = `${event.id}:response`;
  const parametersKey = `${event.id}:parameters`;
  const parameters = event.payload?.parameters;
  const requestLabel = raw.raw_request ? t("activity.rawRequest") : t("activity.originalRequest");
  const responseLabel = raw.raw_response ? t("activity.rawResponse") : t("activity.serverReturned");
  const outcome = outcomeKey(event.result) ? t(outcomeKey(event.result)) : event.result || "";

  async function openSealed(kind: "request" | "response") {
    setRevealFailed(false);
    try {
      const envelope = isRecord(raw.envelope) ? raw.envelope : null;
      const content = envelope
        ? await decryptHeldEnvelope(orgId, event.id, "audit", envelope as PayloadEnvelope)
        : await openSealedActivity(event.id, orgId);
      const opened = content as Record<string, unknown>;
      if (kind === "request") setRequestView(opened.raw_request ?? opened.arguments ?? opened);
      else setResponseView(serverBody(opened.raw_response ?? opened.server_result ?? opened.agent_result) ?? opened);
    } catch {
      setRevealFailed(true);
    }
  }

  return (
    <div>
      <div className="text-[13px] font-medium">
        <span className="mr-2 font-mono text-[12px] text-muted-foreground">{step}</span>
        {title}
      </div>
      <div className="mt-1 font-mono text-[11px] text-muted-foreground">{formatClock(event.at)}</div>
      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
        {t("activity.eventId")} {event.id}
      </div>
      {event.event === "tool_requested" ? (
        <div className="mt-2">
          <Line label={t("activity.initiator")} value={actor} />
          <Line label={t("activity.requestedTool")} value={event.tool || ""} />
          <Line label={t("activity.mcpServer")} value={server} />
          {hasBody(rawRequest) || sealed ? (
            <button
              type="button"
              className="mt-1 text-[13px] text-muted-foreground underline hover:text-foreground"
              onClick={() => {
                if (requestView !== undefined) {
                  setRequestView(undefined);
                  return;
                }
                if (hasBody(rawRequest)) onToggle(requestKey);
                else void openSealed("request");
              }}
            >
              {openBody === requestKey || requestView !== undefined ? t("activity.hideRequest") : requestLabel}
            </button>
          ) : null}
          {openBody === requestKey || requestView !== undefined ? <Body label={requestLabel} value={rawRequest} /> : null}
        </div>
      ) : null}
      {event.event === "policy_evaluated" ? (
        <div className="mt-2">
          <Line label={t("activity.accordingTo")} value={policyBasis(event, policies, t("activity.noPolicy"))} />
          <Line label={t("activity.outcome")} value={outcome} />
          <Line label={t("approvals.reason")} value={textOf(event.raw?.reason).trim()} />
        </div>
      ) : null}
      {event.event === "tool_executed" ? (
        <div className="mt-2">
          <Line label={t("activity.tool")} value={event.tool || ""} />
          <Line label={t("activity.mcpServer")} value={server} />
          <Line label={t("activity.executionResult")} value={outcome} />
          {hasBody(rawResponse) || sealed ? (
            <button
              type="button"
              className="mt-1 text-[13px] text-muted-foreground underline hover:text-foreground"
              onClick={() => {
                if (responseView !== undefined) {
                  setResponseView(undefined);
                  return;
                }
                if (hasBody(rawResponse)) onToggle(responseKey);
                else void openSealed("response");
              }}
            >
              {openBody === responseKey || responseView !== undefined ? t("activity.hideRawResponse") : responseLabel}
            </button>
          ) : (
            <p className="mt-1 text-[13px] text-muted-foreground">{t("activity.noServerBody")}</p>
          )}
          {openBody === responseKey || responseView !== undefined ? <Body label={responseLabel} value={rawResponse} /> : null}
          {revealFailed ? <p className="mt-1 text-[13px] text-destructive">{t("activity.rawLocked")}</p> : null}
        </div>
      ) : null}
      {event.event !== "tool_requested" && event.event !== "policy_evaluated" && event.event !== "tool_executed" ? (
        <div className="mt-2">
          <Line label={t(kindLabel[event.actorKind])} value={actor} />
          {event.tool ? <Line label={t("activity.tool")} value={event.tool} /> : null}
          {server ? <Line label={t("activity.mcpServer")} value={server} /> : null}
          {outcome ? <Line label={t("activity.outcome")} value={outcome} /> : null}
          <Body label={t("activity.input")} value={event.payload?.input} />
          {event.event === "approval_requested" && hasBody(parameters) ? (
            <button type="button" className="mt-1 text-[13px] text-muted-foreground underline hover:text-foreground" onClick={() => onToggle(parametersKey)}>
              {openBody === parametersKey ? t("activity.hideParameters") : t("activity.parameters")}
            </button>
          ) : (
            <Body label={t("activity.parameters")} value={parameters} />
          )}
          {event.event === "approval_requested" && openBody === parametersKey ? <Body label={t("activity.parameters")} value={parameters} /> : null}
          {event.payload?.sealed === true ? (
            <button
              type="button"
              className="mt-1 text-[13px] text-muted-foreground underline hover:text-foreground"
              onClick={() => {
                void openSealedActivity(event.id, orgId)
                  .then((content) => {
                    setOpened(content);
                    setRevealFailed(false);
                  })
                  .catch(() => setRevealFailed(true));
              }}
            >
              {t("activity.reveal")}
            </button>
          ) : null}
          {revealFailed ? <p className="mt-1 text-[13px] text-destructive">{t("activity.revealFailed")}</p> : null}
          {opened ? <Body label={t("activity.reveal")} value={opened} /> : null}
          <Body label={t("activity.result")} value={typeof event.payload?.result === "object" ? event.payload.result : undefined} />
        </div>
      ) : null}
    </div>
  );
}
