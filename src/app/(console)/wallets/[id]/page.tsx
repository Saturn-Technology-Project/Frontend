"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole } from "@/hooks/use-console";
import { formatUsdc, relativeTime, shortAddress } from "@/lib/format";
import { agentCopy, useI18n } from "@/lib/i18n";
import type { PaymentStatus } from "@/types";

const paymentTone: Record<PaymentStatus, "pending" | "completed" | "rejected" | "failed"> = {
  pending: "pending",
  verified: "pending",
  settled: "completed",
  denied: "rejected",
  failed: "failed",
};

export default function WalletDetailPage() {
  const { t, locale } = useI18n();
  const params = useParams<{ id: string }>();
  const { data, isPending, isError } = useConsole();
  const wallet = data?.wallets.find((item) => item.id === params.id);
  const agent = data?.agents.find((item) => item.id === wallet?.agentId);
  const payments = (data?.payments ?? []).filter(
    (payment) => payment.walletId === wallet?.id
  );
  const copy = agent ? agentCopy(locale, agent.id, agent) : null;
  const x402 = data?.x402;

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      {!wallet ? (
        <div className="px-4 py-6 md:px-10 md:py-10 text-[13px] text-muted-foreground">
          {t("wallets.notFound")}
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[720px] px-4 py-6 md:px-10 md:py-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-[11px] text-muted-foreground">
                {t("wallets.role")}
              </div>
              <h1 className="mt-1 text-[22px] font-medium tracking-tight">
                {copy?.name ?? wallet.agentId}
              </h1>
            </div>
            <StatusLabel tone={wallet.status === "active" ? "active" : "paused"}>
              {wallet.status}
            </StatusLabel>
          </div>

          <div className="mt-10 border-t border-border pt-8">
            <SectionLabel>{t("wallets.balance")}</SectionLabel>
            <div className="mt-3 font-mono text-[28px] leading-none tracking-tight">
              {formatUsdc(wallet.balance, wallet.asset)}
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-y-6 border-t border-border pt-8 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-8">
            <Meta label={t("wallets.network")} value={wallet.network} />
            <Meta label={t("wallets.asset")} value={wallet.asset} />
            <Meta
              label={t("wallets.dailyLimit")}
              value={formatUsdc(wallet.dailySpendLimit, wallet.asset)}
            />
            <Meta
              label={t("wallets.perTx")}
              value={formatUsdc(wallet.perTxLimit, wallet.asset)}
            />
            <Meta
              label={t("wallets.spentToday")}
              value={formatUsdc(wallet.spentToday, wallet.asset)}
            />
            {x402 ? (
              <Meta
                label={t("wallets.facilitator")}
                value={`${x402.scheme} · ${x402.network}`}
              />
            ) : null}
          </div>

          <div className="mt-10 border-t border-border pt-8">
            <SectionLabel>{t("wallets.address")}</SectionLabel>
            <div className="mt-3 break-all font-mono text-[13px] text-muted-foreground">
              {wallet.address}
            </div>
          </div>

          {agent ? (
            <div className="mt-8">
              <Link
                href="/agents"
                className="text-[12px] text-muted-foreground hover:text-foreground"
              >
                {t("wallets.openAgent")}
              </Link>
            </div>
          ) : null}

          <section className="mt-10 border-t border-border pt-8">
            <SectionLabel>{t("wallets.payments")}</SectionLabel>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {payments.length === 0 ? (
                <li className="py-4 text-[13px] text-muted-foreground">
                  {t("wallets.noPayments")}
                </li>
              ) : (
                payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-col items-start gap-2 py-3.5 text-[13px] sm:grid sm:grid-cols-[1fr_120px_100px] sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono">{payment.tool ?? payment.id}</div>
                      <div className="mt-1 truncate text-[12px] text-muted-foreground">
                        {shortAddress(payment.payTo)}
                        {payment.txHash ? ` · ${shortAddress(payment.txHash)}` : ""}
                      </div>
                    </div>
                    <span className="font-mono text-[12px]">
                      {formatUsdc(payment.amount, payment.asset)}
                    </span>
                    <StatusLabel
                      tone={paymentTone[payment.status]}
                      className="sm:justify-self-end"
                    >
                      {t(`wallets.${payment.status === "verified" ? "pending" : payment.status}`)}
                    </StatusLabel>
                    {payment.runId && agent ? (
                      <div className="col-span-3 -mt-1 pb-1">
                        <Link
                          href={`/agents/${agent.id}/runs/${payment.runId}`}
                          className="text-[12px] text-muted-foreground hover:text-foreground"
                        >
                          {t("activity.openRun")} · {relativeTime(payment.createdAt, locale)}
                        </Link>
                      </div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}
    </QueryGate>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-3 font-mono text-[13px]">{value}</div>
    </div>
  );
}
