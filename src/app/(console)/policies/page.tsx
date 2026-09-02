"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { useConsole } from "@/hooks/use-console";
import { useI18n } from "@/lib/i18n";

export default function PoliciesPage() {
  const { t } = useI18n();
  const { data, isPending, isError } = useConsole();
  const policies = data?.policies ?? [];

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">
          {t("policies.title")}
        </h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t("policies.subtitle")}
        </p>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {policies.map((policy) => (
            <li key={policy.id}>
              <Link
                href={`/policies/${policy.id}`}
                className="flex items-center justify-between gap-6 py-4 hover:bg-muted/40"
              >
                <span className="text-[14px] font-medium">{policy.name}</span>
                <span className="text-[12px] text-muted-foreground">
                  {policy.who.join(", ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </QueryGate>
  );
}
