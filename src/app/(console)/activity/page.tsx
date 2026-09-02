"use client";

import { QueryGate } from "@/components/layout/query-gate";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { useConsole } from "@/hooks/use-console";
import { useI18n } from "@/lib/i18n";

export default function ActivityPage() {
  const { t } = useI18n();
  const { data, isPending, isError } = useConsole();
  const events = data?.events ?? [];

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("activity.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t("activity.subtitle")}
        </p>
        <div className="mt-8 max-w-[880px]">
          {events.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t("activity.empty")}</p>
          ) : (
            <ActivityTimeline events={events} />
          )}
        </div>
      </div>
    </QueryGate>
  );
}
