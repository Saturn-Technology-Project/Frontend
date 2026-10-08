"use client";

import { useParams, useRouter } from "next/navigation";
import { PolicyForm } from "@/components/policies/policy-form";
import { QueryGate } from "@/components/layout/query-gate";
import { useConsole, useUpdatePolicy } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function EditPolicyPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isPending, isError } = useConsole();
  const updatePolicy = useUpdatePolicy();
  const policy = data?.policies.find((item) => item.id === params.id);
  const canWrite = canAccess(
    useAuthStore((state) => state.user?.permissions),
    "policies",
    "write"
  );
  const tools = Array.from(
    new Set((data?.integrations ?? []).flatMap((item) => item.functions.map((fn) => fn.name)))
  );

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      {!policy || !canWrite ? (
        <div className="px-4 py-6 md:px-10 md:py-10 text-[13px] text-muted-foreground">
          {t("policies.notFound")}
        </div>
      ) : (
        <div className="px-4 py-6 md:px-10 md:py-10">
          <h1 className="text-[22px] font-medium tracking-tight">{t("policies.edit")}</h1>
          <div className="mt-8">
            <PolicyForm
              policy={policy}
              agents={data?.agents ?? []}
              tools={tools}
              submitting={updatePolicy.isPending}
              error={updatePolicy.isError}
              onSubmit={async (body) => {
                await updatePolicy.mutateAsync({ id: policy.id, body });
                router.push(`/policies/${policy.id}`);
              }}
            />
          </div>
        </div>
      )}
    </QueryGate>
  );
}
