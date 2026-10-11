"use client";

import { QueryGate } from "@/components/layout/query-gate";
import { useSubscription } from "@/hooks/use-team";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const planIds = ["free", "pro", "team", "enterprise"] as const;
const planRank: Record<(typeof planIds)[number], number> = { free: 0, pro: 1, team: 2, enterprise: 3 };

function planAction(current: string, id: (typeof planIds)[number]) {
  const rank = planRank[current as (typeof planIds)[number]] ?? 0;
  if (planRank[id] === rank) return "current";
  return planRank[id] > rank ? "upgrade" : "downgrade";
}

function formatDay(iso: string, locale: "en" | "zh") {
  return new Date(iso).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SubscriptionPage() {
  const { t, locale } = useI18n();
  const { data, isPending, isError } = useSubscription();
  const plans = planIds.map((id) => ({
    id,
    kind: t(`plans.${id}.kind`),
    name: t(`plans.${id}.name`),
    price: t(`plans.${id}.price`),
    period: t(`plans.${id}.period`),
    tagline: t(`plans.${id}.tagline`),
    points: [1, 2, 3, 4, 5].map((index) => t(`plans.${id}.point${index}`)),
  }));
  const currentPlan = (data?.plan.id ?? "free").toLowerCase();

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      {!data ? (
        <div className="px-4 py-6 text-[13px] text-muted-foreground md:px-10 md:py-8">
          {t("common.apiError")}
        </div>
      ) : (
        <div className="px-4 py-6 md:px-10 md:py-8">
          <h1 className="text-[26px] font-semibold tracking-tight">{t("subscription.title")}</h1>
          <div className="mt-8 border-t border-border">
            <SettingRow label={t("subscription.plan")}>{data.plan.name}</SettingRow>
            <SettingRow label={t("subscription.renews")}>{formatDay(data.renews_on, locale)}</SettingRow>
            <SettingRow label={t("subscription.payment")}>
              {data.payment.last4 && !data.payment.demo ? (
                <span>
                  {data.payment.brand.toUpperCase()} ···· {data.payment.last4}
                  {data.payment.exp ? <span className="ml-3 text-muted-foreground">{data.payment.exp}</span> : null}
                </span>
              ) : (
                <span className="text-muted-foreground">{t("subscription.noPayment")}</span>
              )}
            </SettingRow>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-4">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-xl bg-card p-7",
                  plan.id === currentPlan ? "border-2 border-black" : "border border-border"
                )}
              >
                <p className="text-[13px] text-muted-foreground">{plan.kind}</p>
                <h2 className="mt-1.5 text-[28px] font-medium tracking-tight">{plan.name}</h2>
                <p className="mt-1 text-[14px] font-medium">
                  {plan.price}
                  {plan.period ? <span className="font-normal text-muted-foreground"> · {plan.period}</span> : null}
                </p>
                <p className="mt-3.5 text-[14px] leading-6 text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5 border-t border-border pt-5 text-[15px] leading-6">
                  {plan.points.map((point) => (
                    <li key={point} className="relative pl-6">
                      <span className="absolute left-0 font-semibold text-[#b85c3d]">✓</span>
                      {point}
                    </li>
                  ))}
                </ul>
                <PlanAction action={planAction(currentPlan, plan.id)} label={t(`subscription.${planAction(currentPlan, plan.id)}`)} />
              </article>
            ))}
          </div>
        </div>
      )}
    </QueryGate>
  );
}

function PlanAction({ action, label }: { action: "current" | "upgrade" | "downgrade"; label: string }) {
  return (
    <button
      type="button"
      disabled={action === "current"}
      className={cn(
        "mt-7 flex h-11 w-full items-center justify-center rounded-lg text-[15px] font-medium",
        action === "upgrade" && "bg-foreground text-background",
        action === "downgrade" && "border border-border text-foreground",
        action === "current" && "cursor-default border border-border bg-muted text-foreground disabled:opacity-100"
      )}
    >
      {label}
    </button>
  );
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-border py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="min-w-0 text-[14px]">{children}</div>
    </div>
  );
}
