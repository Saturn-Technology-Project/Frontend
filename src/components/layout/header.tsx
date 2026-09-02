"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth";
import { logout } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";
import { useConsole } from "@/hooks/use-console";

export function Header() {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isError } = useConsole();
  const orgName = useAuthStore((state) => state.org?.name);
  const userName = useAuthStore((state) => state.user?.name);
  const healthy =
    !isError &&
    Boolean(data) &&
    (data?.services.length
      ? data.services.every((service) => service.status === "operational")
      : true);

  return (
    <header className="relative flex h-12 shrink-0 items-center border-b border-border bg-background px-5">
      <div className="relative z-10 min-w-0 max-w-[30%] truncate text-[13px] font-medium tracking-[0.04em] text-foreground">
        {orgName || "—"}
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-[13px] font-medium tracking-[0.12em] text-foreground">
          {t("nav.panel")}
        </div>
      </div>
      <div className="relative z-10 ml-auto flex items-center gap-4">
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
          <StatusDot tone={healthy ? "operational" : "down"} />
          <span>{userName}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await logout();
              queryClient.clear();
              router.replace("/login");
            }}
          >
            {t("login.signOut")}
          </button>
        </div>
      </div>
    </header>
  );
}
