"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useConsole } from "@/hooks/use-console";
import { formatUsdc } from "@/lib/format";
import { agentCopy, useI18n } from "@/lib/i18n";

export default function WalletsPage() {
  const { t, locale } = useI18n();
  const { data, isPending, isError } = useConsole();
  const wallets = data?.wallets ?? [];
  const x402 = data?.x402;

  return (
    <QueryGate isPending={isPending && !data} isError={isError && !data}>
      <div className="px-4 py-6 md:px-10 md:py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("wallets.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">
          {t("wallets.subtitle")}
        </p>

        {x402 ? (
          <div className="mt-8 max-w-[720px] border-y border-border py-5">
            <SectionLabel>{t("wallets.facilitator")}</SectionLabel>
            <div className="mt-3 font-mono text-[13px] text-muted-foreground">
              {x402.scheme} · {x402.network}
            </div>
          </div>
        ) : null}

        <ul className="mt-8 divide-y divide-border border-y border-border">
          {wallets.length === 0 ? (
            <li className="py-4 text-[13px] text-muted-foreground">
              {t("wallets.empty")}
            </li>
          ) : (
            wallets.map((wallet) => {
              const agent = data?.agents.find((item) => item.id === wallet.agentId);
              const name = agent
                ? agentCopy(locale, agent.id, agent).name
                : wallet.agentId;
              return (
                <li key={wallet.id}>
                  <Link
                    href={`/wallets/${wallet.id}`}
                    className="flex flex-col items-start gap-1 py-4 hover:bg-muted/40 md:grid md:grid-cols-[220px_1fr_160px_120px] md:items-center md:gap-6"
                  >
                    <span className="text-[14px] font-medium">{name}</span>
                    <span className="font-mono text-[13px]">
                      {formatUsdc(wallet.balance, wallet.asset)}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {t("wallets.spentToday")} {formatUsdc(wallet.spentToday, wallet.asset)}
                    </span>
                    <StatusLabel
                      tone={wallet.status === "active" ? "active" : "paused"}
                      className="md:justify-self-end"
                    >
                      {wallet.network}
                    </StatusLabel>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </QueryGate>
  );
}
