"use client";

import { useParams } from "next/navigation";
import { QueryGate } from "@/components/layout/query-gate";
import { PolicyView } from "@/components/policies/policy-view";
import { useConsole } from "@/hooks/use-console";
import { useI18n } from "@/lib/i18n";

export default function PolicyPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const { data, isPending, isError } = useConsole();
  const policy = data?.policies.find((item) => item.id === params.id);

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      {!policy ? (
        <div className="px-10 py-10 text-[13px] text-muted-foreground">
          {t("policies.notFound")}
        </div>
      ) : (
        <div className="px-10 py-10">
          <PolicyView policy={policy} />
        </div>
      )}
    </QueryGate>
  );
}
