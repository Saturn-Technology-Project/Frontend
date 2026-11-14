"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchStatus, fetchStatusHistory } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  CONSOLE,
  cellTone,
  componentRows,
  formatUptime,
  overall,
  type CellTone,
  type ComponentRow,
  type ComponentState,
  type DayCell,
  type Overall,
} from "@/lib/status-page";
import { cn } from "@/lib/utils";

const REFRESH_MS = 30_000;
// The API recounts history once a minute; asking more often returns the same answer.
const HISTORY_REFRESH_MS = 5 * 60_000;
// A phone is too narrow for ninety bars, so it shows the most recent of them.
const NARROW_DAYS = 30;

const stateDot: Record<ComponentState, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  down: "bg-destructive",
  unknown: "bg-[#c4c4be]",
};

const stateText: Record<ComponentState, string> = {
  operational: "text-success",
  degraded: "text-warning",
  down: "text-destructive",
  unknown: "text-muted-foreground",
};

const cellColor: Record<CellTone, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  down: "bg-destructive",
  none: "bg-muted",
};

const banner: Record<Overall, string> = {
  operational: "border-success/30 bg-success/10",
  degraded: "border-warning/30 bg-warning/10",
  outage: "border-destructive/30 bg-destructive/10",
  unknown: "border-border bg-card",
};

const bannerDot: Record<Overall, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  outage: "bg-destructive",
  unknown: "bg-[#c4c4be]",
};

export default function StatusPage() {
  const { t, locale, setLocale } = useI18n();
  const status = useQuery({
    queryKey: ["status"],
    queryFn: fetchStatus,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 0,
  });
  const history = useQuery({
    queryKey: ["status-history"],
    queryFn: fetchStatusHistory,
    refetchInterval: HISTORY_REFRESH_MS,
    retry: 1,
  });

  const phase = status.isError ? "unreachable" : status.data ? "ok" : "loading";
  const today = new Date().toISOString().slice(0, 10);
  const rows = componentRows(phase, status.data, history.data, today);
  const summary = overall(rows);
  const tag = locale === "zh" ? "zh-Hant" : "en-US";
  // A failed check is the latest one, even though the last good answer is still held: show when
  // it failed, by this browser's clock, not the time of the answer that is no longer true.
  const checkedAt = status.isError
    ? new Date(status.errorUpdatedAt)
    : status.data?.checked_at
      ? new Date(status.data.checked_at)
      : null;
  const checkedText = checkedAt
    ? new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(checkedAt)
    : "";

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border px-5">
        <Link href="/" className="text-[13px] font-medium tracking-[0.18em]">
          SATURN
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.04em]">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={locale === "en" ? "text-foreground" : "text-muted-foreground"}
          >
            English(US)
          </button>
          <span className="text-border">/</span>
          <button
            type="button"
            onClick={() => setLocale("zh")}
            className={locale === "zh" ? "text-foreground" : "text-muted-foreground"}
          >
            繁體中文
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <h1 className="text-[22px] font-medium tracking-tight">{t("statusPage.title")}</h1>

        <section
          aria-live="polite"
          className={cn("mt-6 flex items-center gap-3 rounded-lg border px-4 py-4", banner[summary])}
        >
          <span className={cn("size-2.5 shrink-0 rounded-full", bannerDot[summary])} />
          <p className="text-[16px] font-medium">{t(`statusPage.overall.${summary}`)}</p>
        </section>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          <p>
            {checkedText ? t("statusPage.lastChecked", { time: checkedText }) : t("statusPage.overall.unknown")}
            <span className="mx-1.5 text-border">·</span>
            {t("statusPage.autoRefresh")}
          </p>
          <button
            type="button"
            onClick={() => {
              void status.refetch();
              void history.refetch();
            }}
            disabled={status.isFetching}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-foreground hover:bg-muted disabled:opacity-50"
          >
            {t("statusPage.refresh")}
          </button>
        </div>

        <h2 className="mt-10 text-[13px] font-medium text-muted-foreground">{t("statusPage.services")}</h2>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
          {rows.map((row) => (
            <ServiceRow key={row.id} row={row} tag={tag} />
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          {(["operational", "degraded", "down", "none"] as const).map((tone) => (
            <span key={tone} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-[2px]", cellColor[tone])} />
              {t(`statusPage.legend.${tone}`)}
            </span>
          ))}
        </div>

        <p className="mt-6 text-[12px] leading-6 text-muted-foreground">{t("statusPage.how")}</p>
        <p className="mt-6 text-[13px]">
          <Link href="/overview" className="underline underline-offset-4 hover:text-muted-foreground">
            {t("statusPage.signIn")}
          </Link>
        </p>
      </main>
    </div>
  );
}

function ServiceRow({ row, tag }: { row: ComponentRow; tag: string }) {
  const { t, locale } = useI18n();
  const [hovered, setHovered] = useState<DayCell | null>(null);
  // Services this page knows get its own wording; anything else keeps the API's name.
  const named = ["console", "api", "database", "redis"].includes(row.id);
  const name = named ? t(`statusPage.service.${row.id}.name`) : row.name;
  const description = named ? t(`statusPage.service.${row.id}.description`) : "";
  const cells = row.cells;
  const sampled = cells?.some((cell) => cell.uptime !== null) ?? false;
  const dayText = (day: string) =>
    new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

  return (
    <li className="px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-medium">{name}</p>
          {description ? <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p> : null}
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-[13px]", stateText[row.state])}>
          <span className={cn("size-2 rounded-full", stateDot[row.state])} />
          {t(`statusPage.state.${row.state}`)}
        </span>
      </div>

      {cells === null ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          {row.id === CONSOLE ? t("statusPage.consoleNote") : t("statusPage.noHistory")}
        </p>
      ) : (
        <>
          <div
            role="img"
            aria-label={t("statusPage.historyLabel", {
              name,
              n: cells.length,
              value: sampled ? formatUptime(row.uptime) : t("statusPage.noHistory"),
            })}
            className="mt-3 flex h-8 gap-px"
            onMouseLeave={() => setHovered(null)}
          >
            {cells.map((cell, index) => (
              <span
                key={cell.day}
                onMouseEnter={() => setHovered(cell)}
                className={cn(
                  "min-w-0 flex-1 rounded-[2px] transition-opacity hover:opacity-70",
                  cellColor[cellTone(cell.uptime)],
                  index < cells.length - NARROW_DAYS && "hidden sm:block"
                )}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
            {hovered ? (
              <span className="text-foreground">
                {hovered.uptime === null
                  ? t("statusPage.dayNoData", { day: dayText(hovered.day) })
                  : t("statusPage.dayDetail", { day: dayText(hovered.day), value: formatUptime(hovered.uptime) })}
              </span>
            ) : (
              <>
                <span>
                  <span className="hidden sm:inline">{t("statusPage.daysAgo", { n: cells.length })}</span>
                  <span className="sm:hidden">{t("statusPage.daysAgo", { n: Math.min(cells.length, NARROW_DAYS) })}</span>
                </span>
                <span className={locale === "zh" ? "" : "text-center"}>
                  {sampled ? t("statusPage.uptime", { value: formatUptime(row.uptime) }) : t("statusPage.noHistory")}
                </span>
                <span>{t("statusPage.today")}</span>
              </>
            )}
          </div>
        </>
      )}
    </li>
  );
}
