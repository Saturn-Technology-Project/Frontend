"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function UpgradePrompt({ title, body }: { title?: string; body?: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-6">
      <h2 className="text-[15px] font-medium">{title ?? t("plan.upgradeTitle")}</h2>
      <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{body ?? t("plan.upgradeBody")}</p>
      <Link
        href="/subscription"
        className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-3 text-[13px] text-primary-foreground hover:bg-primary/90"
      >
        {t("plan.upgradeAction")}
      </Link>
    </div>
  );
}
