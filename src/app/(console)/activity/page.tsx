"use client";

import { useSearchParams } from "next/navigation";
import { AuditLog } from "@/components/activity/activity-timeline";
import { QueryGate } from "@/components/layout/query-gate";
import { useConsole } from "@/hooks/use-console";
import { useEntitlements } from "@/hooks/use-entitlements";

export default function ActivityPage() {
  const search = useSearchParams();
  const { data, isPending, isError } = useConsole();
  const { auditFull } = useEntitlements();

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-4 py-5 md:px-8 md:py-6">
        <AuditLog
          events={data?.events ?? []}
          urlQuery={search.get("q") ?? ""}
          focusEvent={search.get("event") ?? ""}
          detailed={auditFull}
        />
      </div>
    </QueryGate>
  );
}
