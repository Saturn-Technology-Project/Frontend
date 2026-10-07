"use client";

import Link from "next/link";
import { useState } from "react";
import { QueryGate } from "@/components/layout/query-gate";
import { Button } from "@/components/ui/button";
import { useConsole, useCreateAgent } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";

export default function OverviewPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const name = useAuthStore((state) => state.user?.name) || "there";
  const canCreate = canAccess(useAuthStore((state) => state.user?.permissions), "agents", "write");
  const { data, isPending, isError } = useConsole();
  const create = useCreateAgent();
  const [adding, setAdding] = useState(false);
  const [agentName, setAgentName] = useState("");
  const agents = data?.agents ?? [];
  const servers = data?.mcpServers ?? [];
  const runs = data?.runs ?? [];
  const events = data?.events ?? [];
  const pending = data?.approvals.filter((item) => item.status === "pending").length ?? 0;
  const calls = runs.reduce((sum, run) => sum + run.actions.length, 0);
  const usage = new Map<string, number>();
  for (const event of events) {
    if (!event.tool) continue;
    usage.set(event.tool, (usage.get(event.tool) ?? 0) + 1);
  }
  const bars = [...usage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = bars[0]?.[1] ?? 1;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "overview.greetingMorning" : hour < 18 ? "overview.greetingAfternoon" : "overview.greetingEvening";

  async function addAgent() {
    const next = agentName.trim();
    if (!next) return;
    const created = await create.mutateAsync({ name: next });
    setAgentName("");
    setAdding(false);
    router.push(`/agents/${created.id}`);
  }

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">{t(greeting, { name })}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{t("overview.greetingBody")}</p>
          </div>
          {canCreate ? (
            adding ? (
              <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); void addAgent(); }}>
                <input
                  value={agentName}
                  onChange={(event) => setAgentName(event.target.value)}
                  placeholder={t("agents.title")}
                  className="h-9 rounded-lg border border-border bg-card px-3 text-[13px] outline-none"
                />
                <Button type="submit" disabled={create.isPending || !agentName.trim()}>{t("overview.createAgent")}</Button>
              </form>
            ) : (
              <Button type="button" onClick={() => setAdding(true)}>{t("overview.createAgent")}</Button>
            )
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3">
          <Stat href="/agents" label={t("overview.activeAgents")} value={agents.filter((item) => item.status === "active").length} />
          <Stat href="/tools/connections" label={t("overview.connectedMcps")} value={servers.length} />
          <Stat href="/runs" label={t("overview.toolCalls")} value={calls} />
          <Stat href="/approvals" label={t("overview.approvals")} value={pending} />
        </div>

        <div className="mt-4 grid grid-cols-[1.4fr_0.8fr] gap-3">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-[15px] font-medium">{t("overview.recentActivity")}</h2>
            {events.length === 0 ? (
              <p className="mt-6 text-[13px] text-muted-foreground">{t("activity.empty")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {events.slice(0, 6).map((event) => (
                  <li key={event.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px]">{event.title}</div>
                      <div className="mt-0.5 text-[12px] text-muted-foreground">
                        {event.actor} · {relativeTime(event.at, locale)}
                      </div>
                    </div>
                    {event.result ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-success">{event.result}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-[15px] font-medium">{t("overview.toolUsage")}</h2>
            {bars.length === 0 ? (
              <p className="mt-6 text-[13px] text-muted-foreground">{t("overview.noUsage")}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {bars.map(([tool, count]) => (
                  <li key={tool}>
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className="truncate font-mono">{tool}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-foreground" style={{ width: `${Math.max(8, (count / max) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </QueryGate>
  );
}

function Stat({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="rounded-xl border border-border bg-card px-4 py-4 hover:border-foreground/20">
      <div className="text-[28px] font-semibold tracking-tight">{value.toLocaleString()}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">{label}</div>
    </Link>
  );
}
