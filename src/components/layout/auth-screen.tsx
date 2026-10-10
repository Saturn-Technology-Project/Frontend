"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function AuthScreen({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border px-5">
        <div className="text-[13px] font-medium tracking-[0.18em]">SATURN</div>
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.04em]">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={locale === "en" ? "text-foreground" : "text-muted-foreground"}
          >
            EN
          </button>
          <span className="text-border">/</span>
          <button
            type="button"
            onClick={() => setLocale("zh")}
            className={locale === "zh" ? "text-foreground" : "text-muted-foreground"}
          >
            中文
          </button>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[360px]">{children}</div>
      </main>
    </div>
  );
}
