"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { buttonVariants } from "@/components/ui/button";
import { useConsole } from "@/hooks/use-console";
import { useAuthStore } from "@/lib/auth";
import { relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { profileIdentity, saturnMcpAgents } from "@/lib/profile";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const { t, locale } = useI18n();
  const user = useAuthStore((state) => state.user);
  const org = useAuthStore((state) => state.org);
  const name = user?.name || "there";
  const { data, isPending, isError } = useConsole();
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

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-4 py-5 md:px-8 md:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{t(greeting, { name })}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{t("overview.greetingBody")}</p>
          </div>
          <Link href="/agents?connect=1" className={cn(buttonVariants(), "w-full sm:w-auto")}>
            {t("overview.createAgent")}
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat href="/agents" label={t("overview.activeAgents")} value={agents.length} />
          <Stat href="/tools/connections" label={t("overview.connectedMcps")} value={servers.length} />
          <Stat href="/runs" label={t("overview.toolCalls")} value={calls} />
          <Stat href="/approvals" label={t("overview.approvals")} value={pending} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-[15px] font-medium">{t("overview.recentActivity")}</h2>
            {events.length === 0 ? (
              <p className="mt-6 text-[13px] text-muted-foreground">{t("activity.empty")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {events.slice(0, 6).map((event) => (
                  <li key={event.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
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
    <Link href={href} className="rounded-xl border border-border bg-card px-4 py-4 hover:border-foreground/20 active:bg-muted">
      <div className="text-[28px] font-semibold tracking-tight">{value.toLocaleString()}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">{label}</div>
    </Link>
  );
}
