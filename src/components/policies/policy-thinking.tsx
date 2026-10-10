"use client";

import { useEffect, useRef } from "react";
import type { PolicyStreamEvent } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function appendThinking(
  current: string,
  event: PolicyStreamEvent,
  t: (path: string, vars?: Record<string, string | number>) => string
) {
  if (event.type !== "status") return current;
  const line =
    event.code === "reading"
      ? t("policies.thinkingRead", { name: event.name ?? "", count: event.count ?? 0 })
      : event.code === "batch"
        ? t("policies.thinkingBatch", { start: event.start ?? 0, end: event.end ?? 0, total: event.total ?? 0 })
        : event.code === "optimizing"
          ? t("policies.thinkingOptimize")
          : event.code === "unconfigured"
          ? t("policies.thinkingUnconfigured")
          : event.code === "batchFailed"
            ? t("policies.thinkingBatchFailed", { start: event.start ?? 0, end: event.end ?? 0 })
            : "";
  if (!line) return current;
  const base = current && !current.endsWith("\n") ? `${current}\n` : current;
  return `${base}${line}\n`;
}

export function PolicyThinking({ text }: { text: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [text]);

  if (!text) return null;
  return (
    <section className="mt-4">
      <h2 className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">{t("policies.status")}</h2>
      <pre
        ref={ref}
        className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 px-3 py-2 text-[13px] leading-6 text-foreground"
      >
        {text}
      </pre>
    </section>
  );
}
