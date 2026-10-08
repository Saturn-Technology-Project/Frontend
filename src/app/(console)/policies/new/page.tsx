"use client";

import { useRouter } from "next/navigation";
import { PolicyForm } from "@/components/policies/policy-form";
import { QueryGate } from "@/components/layout/query-gate";
import { useConsole, useCreatePolicy } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function CreatePolicyPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data, isPending, isError } = useConsole();
  const createPolicy = useCreatePolicy();
  const canWrite = canAccess(
    useAuthStore((state) => state.user?.permissions),
    "policies",
    "write"
  );
  const tools = Array.from(
    new Set((data?.integrations ?? []).flatMap((item) => item.functions.map((fn) => fn.name)))
  );

  if (!canWrite) {
    return (
      <div className="px-4 py-6 md:px-10 md:py-10 text-[13px] text-muted-foreground">{t("policies.notFound")}</div>
    );
  }

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-4 py-6 md:px-10 md:py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("policies.create")}</h1>
        <div className="mt-8">
          <PolicyForm
            agents={data?.agents ?? []}
            tools={tools}
            submitting={createPolicy.isPending}
            error={createPolicy.isError}
            onSubmit={async (body) => {
              const created = await createPolicy.mutateAsync(body);
              router.push(`/policies/${created.id}`);
            }}
          />
        </div>
      </div>
    </QueryGate>
  );
}
