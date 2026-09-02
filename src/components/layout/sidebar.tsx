"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useConsole } from "@/hooks/use-console";
import { useAuthStore } from "@/lib/auth";
import { canAccess } from "@/lib/access";

const primary = [
  { href: "/overview", key: "nav.overview" },
  { href: "/agents", key: "nav.agents" },
  { href: "/tools", key: "nav.tools" },
  { href: "/policies", key: "nav.policies" },
  { href: "/approvals", key: "nav.approvals" },
  { href: "/wallets", key: "nav.wallets" },
  { href: "/activity", key: "nav.activity" },
  { href: "/team", key: "nav.team", team: true },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/overview") return pathname === "/overview";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { data } = useConsole();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canReadTeam = canAccess(permissions, "team", "read");
  const pending = (data?.approvals ?? []).filter(
    (approval) => approval.status === "pending"
  ).length;

  const items = primary.filter((item) => !("team" in item && item.team) || canReadTeam);

  return (
    <aside className="flex w-[196px] shrink-0 flex-col border-r border-border bg-background">
      <nav className="flex flex-1 flex-col px-3 py-5">
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-8 items-center justify-between rounded-md px-2 text-[13px] transition-colors",
                  active
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                )}
              >
                <span>{t(item.key)}</span>
                {item.href === "/approvals" && pending > 0 ? (
                  <span className="font-mono text-[11px] text-warning">
                    {pending}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto border-t border-border pt-3">
          <Link
            href="/settings"
            className={cn(
              "flex h-8 items-center rounded-md px-2 text-[13px] transition-colors",
              isActive(pathname, "/settings")
                ? "bg-foreground/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
            )}
          >
            {t("nav.settings")}
          </Link>
        </div>
      </nav>
    </aside>
  );
}
