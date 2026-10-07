"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useOrg } from "@/hooks/use-team";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const items = [
  { href: "/overview", key: "nav.home", icon: "home" },
  { href: "/tools", key: "nav.marketplace", icon: "grid" },
  { href: "/tools/connections", key: "nav.connections", icon: "link" },
  { href: "/agents", key: "nav.agents", icon: "bot" },
  { href: "/tools/mapping", key: "nav.mapping", icon: "sliders" },
  { href: "/policies", key: "nav.policies", icon: "shield" },
  { href: "/activity", key: "nav.audit", icon: "list" },
  { href: "/settings", key: "nav.organization", icon: "building" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions;
  const workspace = useOrg();
  const savedOrg = useAuthStore((state) => state.org);
  const kind = workspace.data?.organization.kind ?? savedOrg?.kind;
  const plan = workspace.data?.organization.plan ?? savedOrg?.plan;
  const personal = kind === "personal" || (kind == null && (plan === "free" || plan === "pro" || plan === "trial" || plan === "starter"));
  const canTeam = canAccess(permissions, "team", "read") && !personal;
  const orgName = workspace.data?.organization.name ?? savedOrg?.name;
  const brand = personal ? t("nav.personalLabel") : orgName || "—";

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 px-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">S</span>
        <span className="truncate text-[15px] font-semibold tracking-tight">{brand}</span>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2">
        {items.map((item) => {
          const base = item.href.split("#")[0];
          const reserved = pathname.startsWith("/tools/connections") || pathname.startsWith("/tools/mapping");
          const on = item.href === "/tools"
            ? pathname === "/tools" || (pathname.startsWith("/tools/") && !reserved)
            : pathname === base || pathname.startsWith(`${base}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                on && "bg-sidebar-accent text-foreground hover:bg-sidebar-accent"
              )}
            >
              <NavIcon name={item.icon} />
              {t(item.key)}
            </Link>
          );
        })}
        {canTeam ? (
          <Link
            href="/team"
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              pathname.startsWith("/team") && "bg-sidebar-accent text-foreground"
            )}
          >
            <NavIcon name="users" />
            {t("nav.team")}
          </Link>
        ) : null}
      </nav>
      <div className="border-t border-sidebar-border p-2">
        <Link
          href="/settings"
          className={cn(
            "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            pathname.startsWith("/settings") && "bg-sidebar-accent text-foreground"
          )}
        >
          <NavIcon name="gear" />
          {t("nav.settings")}
        </Link>
        <div className="mt-2 flex items-center gap-2 rounded-lg px-2.5 py-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[12px] font-medium text-foreground">
            {(user?.name || "S").slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px]">{user?.name || "—"}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{user?.email || "—"}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}

function NavIcon({ name }: { name: string }) {
  const common = "size-4 shrink-0";
  const paths: Record<string, ReactNode> = {
    home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />,
    grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    link: <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7L12.7 18" />,
    bot: <path d="M12 8V5M8 8h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3zM9 13h.01M15 13h.01" />,
    sliders: <path d="M4 8h16M4 16h16M8 8v0M16 16v0M9 6v4M15 14v4" />,
    shield: <path d="M12 3 5 6v6c0 4.5 3 7 7 9 4-2 7-4.5 7-9V6z" />,
    list: <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />,
    building: <path d="M4 20h16M6 20V6h12v14M10 10h.01M14 10h.01M10 14h.01M14 14h.01" />,
    users: <path d="M16 19v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1M10 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 19v-1a3 3 0 0 0-2-2.8M16 6.1a3 3 0 0 1 0 5.8" />,
    gear: <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />,
  };
  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
