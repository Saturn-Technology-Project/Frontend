"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function AuthScreen({ children }: { children: ReactNode }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border px-5">
        <div className="text-[13px] font-medium tracking-[0.18em]">SATURN</div>
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.04em]">
          <Link href="/status" className="mr-3 text-muted-foreground hover:text-foreground">
            {t("statusPage.link")}
          </Link>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={locale === "en" ? "text-foreground" : "text-muted-foreground"}
          >
            English(US)
          </button>
          <span className="text-border">/</span>
          <button
            type="button"
            onClick={() => setLocale("zh")}
            className={locale === "zh" ? "text-foreground" : "text-muted-foreground"}
          >
            繁體中文
          </button>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[360px]">{children}</div>
      </main>
    </div>
  );
}
