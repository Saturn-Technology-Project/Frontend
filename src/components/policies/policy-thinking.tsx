"use client";

import type { PolicyStreamEvent } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export type PolicyProgress = {
  label: string;
  done: number;
  total: number;
  indeterminate: boolean;
  note: string;
};

export function applyProgress(
  current: PolicyProgress | null,
  event: PolicyStreamEvent,
  t: (path: string, vars?: Record<string, string | number>) => string
): PolicyProgress | null {
  if (event.type !== "status") return current;
  if (event.code === "reading") {
    const total = event.count ?? 0;
    return {
      label: t("policies.thinkingRead", { name: event.name ?? "", count: total }),
      done: 0,
      total,
      indeterminate: true,
      note: "",
    };
  }
  if (event.code === "progress") {
    const done = event.done ?? 0;
    const total = event.total ?? current?.total ?? 0;
    const failed = event.failed ?? 0;
    return {
      label: t("policies.progressCount", { done, total }),
      done,
      total,
      indeterminate: false,
      note: failed > 0 ? t("policies.progressFailed", { n: failed }) : "",
    };
  }
  if (event.code === "optimizing") {
    const total = event.total ?? 0;
    return {
      label: total > 0 ? t("policies.progressOptimize", { total }) : t("policies.thinkingOptimize"),
      done: 0,
      total,
      indeterminate: true,
      note: "",
    };
  }
  if (event.code === "unconfigured") {
    return {
      label: t("policies.thinkingUnconfigured"),
      done: 0,
      total: 0,
      indeterminate: false,
      note: "",
    };
  }
  return current;
}

export function PolicyProgressBar({ progress }: { progress: PolicyProgress }) {
  const { t } = useI18n();
  const pct = progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;
  return (
    <section className="mt-4" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">{t("policies.status")}</h2>
        {progress.indeterminate || progress.total === 0 ? null : (
          <span className="text-[12px] tabular-nums text-muted-foreground">{pct}%</span>
        )}
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.indeterminate ? undefined : progress.total || 100}
        aria-valuenow={progress.indeterminate ? undefined : progress.done}
        aria-valuetext={progress.label}
      >
        {progress.indeterminate ? (
          <div className="policy-progress-indeterminate h-full w-1/3 rounded-full bg-foreground" />
        ) : (
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
            style={{ width: `${progress.total === 0 ? 0 : pct}%` }}
          />
        )}
      </div>
      <p className="mt-2 text-[13px] text-muted-foreground">{progress.label}</p>
      {progress.note ? <p className="mt-1 text-[13px] text-muted-foreground">{progress.note}</p> : null}
    </section>
  );
}
