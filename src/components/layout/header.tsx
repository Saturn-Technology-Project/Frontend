"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Header() {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
      <form
        className="relative min-w-0 flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("q");
          const q = typeof value === "string" ? value.trim() : "";
          router.push(q ? `/activity?q=${encodeURIComponent(q)}` : "/activity");
        }}
      >
        <input
          name="q"
          placeholder={t("nav.search")}
          className="h-9 w-full max-w-[420px] rounded-full border border-border bg-muted px-4 text-[13px] outline-none focus:border-ring"
        />
      </form>
      <div className="ml-auto flex items-center gap-4">
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
        <button
          type="button"
          className="text-[12px] tracking-[0.06em] text-muted-foreground hover:text-foreground"
          onClick={async () => {
            await logout();
            queryClient.clear();
            router.replace("/login");
          }}
        >
          {t("login.signOut")}
        </button>
      </div>
    </header>
  );
}
