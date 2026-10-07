"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { QueryGate } from "@/components/layout/query-gate";
import { useConsole } from "@/hooks/use-console";
import { relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function ActivityPage() {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const { data, isPending, isError } = useConsole();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("q") ?? "";
    setQuery(value.trim().toLowerCase());
  }, [pathname]);

  const events = (data?.events ?? []).filter((event) => {
    if (!query) return true;
    return [event.title, event.actor, event.tool, event.result, event.detail]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-8 py-6">
        <h1 className="text-[22px] font-medium tracking-tight">{t("nav.audit")}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{t("activity.subtitle")}</p>
        {events.length === 0 ? (
          <p className="mt-8 text-[13px] text-muted-foreground">{t("activity.empty")}</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-border text-[12px] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("activity.time")}</th>
                  <th className="px-4 py-3 font-medium">{t("activity.actor")}</th>
                  <th className="px-4 py-3 font-medium">{t("activity.tool")}</th>
                  <th className="px-4 py-3 font-medium">{t("activity.title")}</th>
                  <th className="px-4 py-3 font-medium">{t("activity.result")}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{relativeTime(event.at, locale)}</td>
                    <td className="px-4 py-3">{event.actor || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{event.tool || "—"}</td>
                    <td className="px-4 py-3">{event.title}</td>
                    <td className="px-4 py-3">{event.result || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </QueryGate>
  );
}
