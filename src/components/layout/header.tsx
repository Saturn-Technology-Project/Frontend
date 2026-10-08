"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { NavIcon } from "@/components/layout/nav-icon";
import { useMobileNav } from "@/components/layout/mobile-nav";
import { logout } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Header() {
  const { locale, setLocale, t } = useI18n();
  const { open, setOpen } = useMobileNav();
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:gap-4 md:px-6 max-md:h-[calc(3.5rem+env(safe-area-inset-top))] max-md:pt-[env(safe-area-inset-top)]">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? t("nav.closeMenu") : t("nav.menu")}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted md:hidden"
        onClick={() => setOpen(!open)}
      >
        <NavIcon name="menu" className="size-5" />
      </button>
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
          className="h-10 w-full max-w-[420px] rounded-full border border-border bg-muted px-4 text-base outline-none focus:border-ring md:h-9 md:text-[13px]"
        />
      </form>
      <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1.5 text-[12px] tracking-[0.04em] md:text-[11px]">
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
          className="inline-flex h-10 items-center whitespace-nowrap px-1 text-[12px] tracking-[0.06em] text-muted-foreground hover:text-foreground md:h-auto"
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
