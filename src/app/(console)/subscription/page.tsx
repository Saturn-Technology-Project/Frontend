"use client";

import { NavIcon } from "@/components/layout/nav-icon";
import { DONATE_URL } from "@/lib/donate";
import { useI18n } from "@/lib/i18n";

// Saturn has no paid plans. Old links to /subscription land here.
export default function SubscriptionPage() {
  const { t } = useI18n();
  return (
    <div className="px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-xl rounded-xl border border-border bg-card px-5 py-6">
        <h1 className="text-[18px] font-medium tracking-tight">{t("donate.title")}</h1>
        <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{t("donate.free")}</p>
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-[13px] text-primary-foreground hover:bg-primary/90"
        >
          <NavIcon name="heart" />
          {t("donate.action")}
        </a>
      </div>
    </div>
  );
}
