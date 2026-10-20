"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, PhotoField } from "@/components/account/photo-field";
import { QueryGate } from "@/components/layout/query-gate";
import { PayloadEncryption } from "@/components/settings/payload-encryption";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { StatusLabel } from "@/components/ui/status-dot";
import { ApiError } from "@/lib/api";
import { orgQueryKey, useOrg, useOrgMembers, usePayInvoice, useSubscription } from "@/hooks/use-team";
import { canAccess } from "@/lib/access";
import { updateOrgPhoto, type SubscriptionInvoice } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

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

export default function SettingsPage() {
  const { t, locale } = useI18n();
  const sessionUser = useAuthStore((state) => state.user);
  const sessionOrg = useAuthStore((state) => state.org);
  const workspace = useOrg();
  const members = useOrgMembers();
  const subscription = useSubscription();
  const pay = usePayInvoice();
  const [invoice, setInvoice] = useState<SubscriptionInvoice | null>(null);
  const organization = workspace.data?.organization;
  const kind = organization?.kind ?? sessionOrg?.kind;
  const plan = organization?.plan ?? sessionOrg?.plan;
  const personal = kind === "personal" || (kind == null && (plan === "free" || plan === "pro" || plan === "trial" || plan === "starter"));
  const canTeam = canAccess(sessionUser?.permissions, "team", "read") && !personal;
  const canEditPhoto = canAccess(sessionUser?.permissions, "team", "write");
  const client = useQueryClient();
  const photo = useMutation({
    mutationFn: updateOrgPhoto,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: orgQueryKey });
    },
  });
  const name = organization?.name ?? sessionOrg?.name ?? "—";
  const photoUrl = organization?.photo ?? sessionOrg?.photo;
  const billing = subscription.data;

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
    <QueryGate isPending={workspace.isPending && !sessionOrg} isError={false}>
      <div className="px-4 py-6 md:px-10 md:py-8">
        <div className="flex items-center gap-3">
          <Avatar photo={photoUrl} name={name} shape="rounded" className="size-10 text-[16px]" />
          <h1 className="truncate text-[26px] font-semibold tracking-tight">{name}</h1>
        </div>
        <PayloadEncryption />

        <div className="mt-8 border-t border-border">
          <SettingRow label={t("settings.logo")} hint={t("settings.logoHint")}>
            <PhotoField
              appearance="inline"
              photo={photoUrl}
              name={name}
              canEdit={canEditPhoto}
              pending={photo.isPending}
              onChange={(next) => photo.mutate(next)}
            />
            {photo.isError ? <p className="mt-2 text-[13px] text-destructive">{photo.error.message}</p> : null}
          </SettingRow>
          <SettingRow label={t("settings.name")}>{name}</SettingRow>
          {canTeam ? (
            <SettingRow label={t("team.members")}>
              <CountLink href="/team" value={members.data?.length} />
            </SettingRow>
          ) : null}

          <SettingRow label={t("subscription.plan")}>
            {billing ? (
              <div className="flex items-baseline justify-between gap-4">
                <span>{billing.plan.name}</span>
                <Link href="/subscription" className="text-[13px] text-muted-foreground hover:text-foreground hover:underline">
                  {t("subscription.managePlan")}
                </Link>
              </div>
            ) : (
              <span className="text-muted-foreground">{subscription.isError ? t("common.apiError") : "—"}</span>
            )}
          </SettingRow>
          <SettingRow label={t("subscription.renews")}>
            {billing ? formatDay(billing.renews_on, locale) : "—"}
          </SettingRow>
          <SettingRow label={t("subscription.payment")}>
            {billing?.payment.last4 && !billing.payment.demo ? (
              <span>
                {billing.payment.brand.toUpperCase()} ···· {billing.payment.last4}
                {billing.payment.exp ? <span className="ml-3 text-muted-foreground">{billing.payment.exp}</span> : null}
              </span>
            ) : (
              <span className="text-muted-foreground">{t("subscription.noPayment")}</span>
            )}
          </SettingRow>
          <SettingRow label={t("subscription.invoices")}>
            {!billing || billing.invoices.length === 0 ? (
              <span className="text-muted-foreground">{t("subscription.emptyInvoices")}</span>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {billing.invoices.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[12px]">{item.number}</div>
                      <div className="mt-0.5 text-[12px] text-muted-foreground">{item.period}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-[12px]">{money(item.amount, item.currency, locale)}</span>
                      <StatusLabel tone={item.status === "paid" ? "completed" : "pending"}>
                        {item.status === "paid" ? t("subscription.paid") : t("subscription.open")}
                      </StatusLabel>
                      {item.status === "open" && billing.payment.last4 && !billing.payment.demo ? (
                        <Button size="sm" variant="outline" onClick={() => setInvoice(item)}>
                          {t("subscription.pay")}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SettingRow>
        </div>
      </div>

      <Dialog open={Boolean(invoice)} onOpenChange={(open) => !open && setInvoice(null)}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(420px,calc(100%-2rem))] max-w-none gap-0 rounded-md p-0 ring-border sm:max-w-none"
        >
          <div className="border-b border-border px-6 py-5">
            <DialogTitle className="text-[15px] font-medium tracking-tight">{t("subscription.payTitle")}</DialogTitle>
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
              <p className="mt-3 text-[13px] text-destructive">
                {pay.error instanceof ApiError && pay.error.status === 501 ? t("subscription.payUnavailable") : t("common.requestFailed")}
              </p>
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

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-border py-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8">
      <div>
        <div className="text-[13px] text-muted-foreground">{label}</div>
        {hint ? <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="min-w-0 text-[14px]">{children}</div>
    </div>
  );
}

function CountLink({ href, value }: { href: string; value: number | undefined }) {
  return (
    <Link href={href} className="hover:underline">
      {value == null ? "—" : value.toLocaleString()}
    </Link>
  );
}
