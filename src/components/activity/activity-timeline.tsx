"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusDot } from "@/components/ui/status-dot";
import { formatClock, formatDayLabel } from "@/lib/format";
import { eventActor, eventText, useI18n } from "@/lib/i18n";
import { useConsole } from "@/hooks/use-console";
import type { ActivityEvent, ActorKind } from "@/types";

const actorTone: Record<ActorKind, "running" | "completed" | "pending" | "info"> = {
  agent: "running",
  human: "pending",
  saturn: "info",
  tool: "completed",
  wallet: "info",
};

function payloadRows(event: ActivityEvent) {
  const rows: { label: string; value: string }[] = [];
  if (event.tool) rows.push({ label: "TOOL", value: event.tool });
  if (event.result) rows.push({ label: "RESULT", value: event.result });
  const raw = event.raw;
  if (raw) {
    for (const [key, value] of Object.entries(raw)) {
      if (value == null) continue;
      rows.push({
        label: key.replaceAll("_", " ").toUpperCase(),
        value: typeof value === "string" ? value : JSON.stringify(value),
      });
    }
  }
  return rows;
}

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  const { t, locale } = useI18n();
  const { data } = useConsole();
  const runs = data?.runs ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const groups = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    const ordered = [...events].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );
    for (const event of ordered) {
      const day = formatDayLabel(event.at, locale);
      const list = map.get(day) ?? [];
      list.push(event);
      map.set(day, list);
    }
    return [...map.entries()];
  }, [events, locale]);

  return (
    <div className="space-y-10">
      {groups.map(([day, dayEvents]) => (
        <section key={day}>
          <SectionLabel className="mb-4">{day}</SectionLabel>
          <ol className="divide-y divide-border border-y border-border">
            {dayEvents.map((event) => {
              const open = openId === event.id;
              const rows = payloadRows(event);
              const run = runs.find((item) => item.id === event.runId);
              const detail = eventText(locale, event.detailKey, event.detail);
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : event.id)}
                    className="grid w-full grid-cols-[92px_176px_1fr] items-start gap-4 py-3.5 text-left"
                  >
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {formatClock(event.at)}
                    </span>
                    <span className="flex items-center gap-2 text-[13px]">
                      <StatusDot tone={actorTone[event.actorKind]} />
                      {eventActor(locale, event)}
                    </span>
                    <span className="text-[13px]">
                      {eventText(locale, event.titleKey, event.title)}
                      {detail ? (
                        <span className="text-muted-foreground"> → {detail}</span>
                      ) : null}
                    </span>
                  </button>
                  {open ? (
                    <div className="mb-4 ml-[92px] rounded-md border border-border bg-card px-4 py-3">
                      {rows.length === 0 ? (
                        <div className="text-[12px] text-muted-foreground">
                          {t("activity.noPayload")}
                        </div>
                      ) : (
                        <dl className="space-y-2 font-mono text-[11px] leading-5">
                          {rows.map((row) => (
                            <div key={row.label} className="grid grid-cols-[92px_1fr] gap-3">
                              <dt className="text-muted-foreground">{row.label}</dt>
                              <dd className="break-all text-foreground">{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {run ? (
                        <Link
                          href={`/agents/${run.agentId}/runs/${run.id}`}
                          className="mt-3 inline-block text-[12px] text-muted-foreground hover:text-foreground"
                        >
                          {t("activity.openRun")}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
