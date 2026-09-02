"use client";

import { session } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";

export function Header() {
  const { locale, setLocale } = useI18n();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-5">
      <div className="text-[13px] font-medium tracking-[0.18em] text-foreground">
        SATURN
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.04em]">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn(
              locale === "en" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            EN
          </button>
          <span className="text-border">/</span>
          <button
            type="button"
            onClick={() => setLocale("zh")}
            className={cn(
              locale === "zh" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            中文
          </button>
        </div>
        <div className="flex items-center gap-2 text-[12px] tracking-[0.06em] text-muted-foreground">
          <StatusDot tone="operational" />
          <span className="uppercase">{session.org.name}</span>
        </div>
      </div>
    </header>
  );
}
