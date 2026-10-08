"use client";

import { useState } from "react";
import { QueryGate } from "@/components/layout/query-gate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { usePayInvoice, useSubscription } from "@/hooks/use-team";
import { useI18n } from "@/lib/i18n";
import type { SubscriptionInvoice } from "@/lib/api";

function money(amount: string, currency: string, locale: "en" | "zh") {
  const value = Number(amount);
  return new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number.isFinite(value) ? value : 0);
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
  const pay = usePayInvoice();
  const [invoice, setInvoice] = useState<SubscriptionInvoice | null>(null);

  async function confirmPay() {
    if (!invoice) return;
    try {
      await pay.mutateAsync(invoice.id);
      setInvoice(null);
    } catch {
      return;
    }
  }

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      {!data ? (
        <div className="px-4 py-6 md:px-10 md:py-10 text-[13px] text-muted-foreground">
          {t("common.apiError")}
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[640px] px-4 py-6 md:px-10 md:py-10">
          <h1 className="text-[22px] font-medium tracking-tight">
            {t("subscription.title")}
          </h1>
          <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
            {t("subscription.subtitle")}
          </p>

          <section className="mt-10 border-t border-border pt-8">
            <SectionLabel>{t("subscription.plan")}</SectionLabel>
            <div className="mt-4 grid grid-cols-1 gap-y-3 text-[13px] sm:grid-cols-[140px_1fr]">
              <div className="text-muted-foreground">{t("subscription.core")}</div>
              <div className="flex items-baseline justify-between gap-4">
                <span>{data.plan.name}</span>
                <span className="font-mono text-[12px] text-muted-foreground">
                  {t("subscription.comingSoon")}
                </span>
              </div>
              <div className="text-muted-foreground">{t("subscription.renews")}</div>
              <div>{formatDay(data.renews_on, locale)}</div>
            </div>
          </section>

          <section className="mt-10 border-t border-border pt-8">
            <SectionLabel>{t("subscription.addons")}</SectionLabel>
            {data.addons.length === 0 ? (
              <p className="mt-4 text-[13px] text-muted-foreground">
                {t("subscription.noAddons")}
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {data.addons.map((addon) => (
                  <li
                    key={addon.id}
                    className="flex items-baseline justify-between gap-4 py-3 text-[13px]"
                  >
                    <span>{addon.name}</span>
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {money(addon.amount, "USD", locale)} / {t("subscription.monthly")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10 border-t border-border pt-8">
            <SectionLabel>{t("subscription.payment")}</SectionLabel>
            {data.payment.last4 && !data.payment.demo ? (
              <div className="mt-4 text-[13px]">
                {data.payment.brand.toUpperCase()} ···· {data.payment.last4}
                {data.payment.exp ? (
                  <span className="ml-3 text-muted-foreground">{data.payment.exp}</span>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-[13px] text-muted-foreground">
                {t("subscription.noPayment")}
              </p>
            )}
          </section>

          <section className="mt-10 border-t border-border pt-8">
            <SectionLabel>{t("subscription.invoices")}</SectionLabel>
            {data.invoices.length === 0 ? (
              <p className="mt-4 text-[13px] text-muted-foreground">
                {t("subscription.emptyInvoices")}
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {data.invoices.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3.5 text-[13px]"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[12px]">{item.number}</div>
                      <div className="mt-0.5 text-muted-foreground">{item.period}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="font-mono text-[12px]">
                        {money(item.amount, item.currency, locale)}
                      </span>
                      <StatusLabel tone={item.status === "paid" ? "completed" : "pending"}>
                        {item.status === "paid"
                          ? t("subscription.paid")
                          : t("subscription.open")}
                      </StatusLabel>
                      {item.status === "open" && data.payment.last4 && !data.payment.demo ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setInvoice(item)}
                        >
                          {t("subscription.pay")}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <Dialog open={Boolean(invoice)} onOpenChange={(open) => !open && setInvoice(null)}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(420px,calc(100%-2rem))] max-w-none gap-0 rounded-md p-0 ring-border sm:max-w-none"
        >
          <div className="border-b border-border px-6 py-5">
            <DialogTitle className="text-[15px] font-medium tracking-tight">
              {t("subscription.payTitle")}
            </DialogTitle>
            <DialogDescription className="mt-2 text-[13px] leading-6 text-muted-foreground">
              {t("subscription.payBody")}
            </DialogDescription>
            {invoice ? (
              <div className="mt-4 flex items-baseline justify-between text-[13px]">
                <span className="font-mono text-[12px]">{invoice.number}</span>
                <span>{money(invoice.amount, invoice.currency, locale)}</span>
              </div>
            ) : null}
            {pay.isError ? (
              <p className="mt-3 text-[13px] text-destructive">{t("common.requestFailed")}</p>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <Button variant="outline" onClick={() => setInvoice(null)}>
              {t("agents.cancel")}
            </Button>
            <Button disabled={pay.isPending} onClick={() => void confirmPay()}>
              {pay.isPending ? t("subscription.paying") : t("subscription.payCta")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </QueryGate>
  );
}
