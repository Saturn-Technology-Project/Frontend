"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MarketIcon } from "@/components/tools/market-icon";
import { QueryGate } from "@/components/layout/query-gate";
import { Button } from "@/components/ui/button";
import { StatusLabel } from "@/components/ui/status-dot";
import { consoleQueryKey, useConsole, useDeleteMcpServer } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { connectMcpServer } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { marketCatalog, marketName } from "@/lib/marketplace";
import { cn } from "@/lib/utils";
import type { ActivityEvent, McpServer } from "@/types";

function sameEndpoint(left: string, right: string) {
  return left.trim().replace(/\/+$/, "").toLowerCase() === right.trim().replace(/\/+$/, "").toLowerCase();
}

function iconId(server: McpServer) {
  const byEndpoint = marketCatalog.find((entry) => entry.endpoint && sameEndpoint(entry.endpoint, server.endpoint));
  if (byEndpoint) return byEndpoint.id;
  const byName = marketCatalog.find((entry) => marketName(entry.id).toLowerCase() === server.name.trim().toLowerCase());
  return byName?.id ?? "";
}

function callsFor(server: McpServer, events: ActivityEvent[]) {
  const names = new Set([...server.tools, ...server.catalog.map((tool) => tool.name)]);
  return events.filter((event) => event.tool && names.has(event.tool));
}

export default function ConnectionsPage() {
  const { t, locale } = useI18n();
  const { data, isPending, isError } = useConsole();
  const canAdmin = canAccess(useAuthStore((state) => state.user?.permissions), "team", "write");
  const servers = data?.mcpServers ?? [];
  const events = data?.events ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = servers.find((server) => server.id === selectedId) ?? null;

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="flex items-start">
        <div className="min-w-0 flex-1 px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-medium tracking-tight">{t("nav.connections")}</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">{t("tools.subtitle")}</p>
            </div>
            <Link href="/tools">
              <Button type="button">{t("tools.connect")}</Button>
            </Link>
          </div>
          {servers.length === 0 ? (
            <p className="mt-8 text-[13px] text-muted-foreground">{t("tools.empty")}</p>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-border text-[12px] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("tools.name")}</th>
                    <th className="px-4 py-3 font-medium">{t("tools.status")}</th>
                    <th className="px-4 py-3 font-medium">{t("tools.endpoint")}</th>
                    <th className="px-4 py-3 font-medium">{t("tools.list")}</th>
                  </tr>
                </thead>
                <tbody>
                  {servers.map((server) => (
                    <tr
                      key={server.id}
                      className={cn("cursor-pointer border-b border-border last:border-0", selectedId === server.id && "bg-muted")}
                      onClick={() => setSelectedId(server.id)}
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="flex size-7 items-center justify-center rounded-full bg-muted">
                            <ServerMark server={server} />
                          </span>
                          {server.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusLabel tone={server.connected ? "connected" : "disconnected"}>
                          {server.connected ? t("tools.connected") : t("connector.offline")}
                        </StatusLabel>
                      </td>
                      <td className="max-w-[360px] truncate px-4 py-3 font-mono text-[12px] text-muted-foreground">
                        {server.endpoint || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t("tools.count", { n: server.tools.length })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {selected ? (
          <ConnectionPanel
            server={selected}
            events={events}
            locale={locale}
            canAdmin={canAdmin}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>
    </QueryGate>
  );
}

function ServerMark({ server }: { server: McpServer }) {
  const id = iconId(server);
  if (id) return <MarketIcon id={id} className="size-3.5" />;
  return <span className="text-[11px] font-medium">{server.name.slice(0, 1).toUpperCase()}</span>;
}

function ConnectionPanel({
  server,
  events,
  locale,
  canAdmin,
  onClose,
}: {
  server: McpServer;
  events: ActivityEvent[];
  locale: "en" | "zh";
  canAdmin: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const remove = useDeleteMcpServer();
  const [confirming, setConfirming] = useState(false);
  const [oauthOpen, setOauthOpen] = useState(false);
  const matched = useMemo(() => callsFor(server, events), [server, events]);
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of matched) {
      const name = event.tool ?? "";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked.slice(0, 3);
    const other = ranked.slice(3).reduce((sum, [, count]) => sum + count, 0);
    return { top, other, max: Math.max(1, top[0]?.[1] ?? 0, other) };
  }, [matched]);

  return (
    <aside className="sticky top-0 flex h-[calc(100vh-3.5rem)] w-[340px] shrink-0 flex-col overflow-y-auto border-l border-border bg-card">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <ServerMark server={server} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[16px] font-medium">{server.name}</div>
            <div className="truncate font-mono text-[11px] text-muted-foreground">{server.endpoint || "—"}</div>
          </div>
        </div>
        <button type="button" className="text-[12px] text-muted-foreground hover:text-foreground" onClick={onClose}>
          {t("marketplace.close")}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 px-5">
        {canAdmin ? (
          confirming ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                {t("agents.cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(server.id, { onSuccess: onClose })}
              >
                {t("tools.disconnect")}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
              {t("tools.disconnect")}
            </Button>
          )
        ) : null}
        <Button variant="outline" size="sm" onClick={() => setOauthOpen((open) => !open)}>
          {t("tools.manageOauth")}
        </Button>
      </div>
      {remove.isError ? <p className="mt-3 px-5 text-[13px] text-destructive">{remove.error.message}</p> : null}
      {oauthOpen ? <OauthForm server={server} canAdmin={canAdmin} /> : null}

      <section className="mt-6 px-5">
        <h2 className="text-[13px] font-medium">{t("tools.usage")}</h2>
        {usage.top.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">{t("overview.noUsage")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {usage.top.map(([name, count]) => (
              <UsageRow key={name} label={name} count={count} max={usage.max} />
            ))}
            <UsageRow label={t("tools.otherUsage")} count={usage.other} max={usage.max} />
          </ul>
        )}
      </section>

      <section className="mt-6 px-5 pb-6">
        <h2 className="text-[13px] font-medium">{t("tools.recent")}</h2>
        {matched.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">{t("activity.empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {matched.slice(0, 6).map((event) => (
              <li key={event.id} className="py-3">
                <div className="truncate text-[13px]">{event.title}</div>
                <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  {[event.tool, event.actor, relativeTime(event.at, locale)].filter(Boolean).join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

function UsageRow({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <li>
      <div className="mb-1 flex justify-between gap-3 text-[12px]">
        <span className="truncate font-mono">{label}</span>
        <span className="text-muted-foreground">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-foreground" style={{ width: `${Math.max(count === 0 ? 0 : 8, (count / max) * 100)}%` }} />
      </div>
    </li>
  );
}

function OauthForm({ server, canAdmin }: { server: McpServer; canAdmin: boolean }) {
  const { t } = useI18n();
  const client = useQueryClient();
  const [token, setToken] = useState("");
  const save = useMutation({
    mutationFn: () =>
      connectMcpServer({
        name: server.name,
        endpoint: server.endpoint,
        authorization: token.trim(),
      }),
    onSuccess: async () => {
      setToken("");
      await client.invalidateQueries({ queryKey: consoleQueryKey });
    },
  });

  return (
    <form
      className="mt-4 space-y-3 border-t border-border px-5 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canAdmin || !token.trim()) return;
        save.mutate();
      }}
    >
      <p className="text-[12px] text-muted-foreground">{server.hasAuthorization ? t("tools.oauthSaved") : t("tools.oauthNone")}</p>
      <p className="text-[12px] leading-5 text-muted-foreground">{t("tools.oauthHint")}</p>
      {canAdmin ? (
        <>
          <input
            type="password"
            value={token}
            autoComplete="off"
            onChange={(event) => setToken(event.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-ring"
          />
          <Button type="submit" size="sm" disabled={save.isPending || !token.trim()}>
            {t("tools.saveToken")}
          </Button>
        </>
      ) : (
        <p className="text-[12px] text-muted-foreground">{t("marketplace.adminOnly")}</p>
      )}
      {save.isError ? <p className="text-[13px] text-destructive">{save.error.message}</p> : null}
    </form>
  );
}
