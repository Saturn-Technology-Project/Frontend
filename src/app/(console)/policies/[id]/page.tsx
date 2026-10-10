"use client";

import { useParams } from "next/navigation";
import { QueryGate } from "@/components/layout/query-gate";
import { PolicyBuilder } from "@/components/policies/policy-builder";
import { useConsole } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function PolicyPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const { data, isPending, isError } = useConsole();
  const policy = data?.policies.find((item) => item.id === params.id);
  const canWrite = canAccess(useAuthStore((state) => state.user?.permissions), "policies", "write");

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      {!policy ? (
        <div className="px-4 py-6 text-[13px] text-muted-foreground md:px-10 md:py-10">{t("policies.notFound")}</div>
      ) : (
        <div className="h-full min-h-[720px]">
          <PolicyBuilder
            key={policy.id}
            policy={policy}
            agents={data?.agents ?? []}
            toolSets={data?.toolSets ?? []}
            canWrite={canWrite}
          />
        </div>
      )}
    </QueryGate>
  );
}
