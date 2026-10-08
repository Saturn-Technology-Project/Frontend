"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { NavIcon } from "@/components/layout/nav-icon";
import { useMobileNav } from "@/components/layout/mobile-nav";
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
  const { open, setOpen } = useMobileNav();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const apply = () => setCompact(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
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
    <>
      {open ? (
        <button
          type="button"
          aria-label={t("nav.closeMenu")}
          className="fixed inset-0 z-50 bg-foreground/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
    <aside
      inert={compact && !open ? true : undefined}
      className={cn(
        "flex h-full w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-[min(88vw,320px)] max-md:pt-[env(safe-area-inset-top)] max-md:pb-[env(safe-area-inset-bottom)] max-md:shadow-xl max-md:transition-transform max-md:duration-200",
        open ? "max-md:translate-x-0" : "max-md:-translate-x-full"
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">S</span>
        <span className="truncate text-[15px] font-semibold tracking-tight">{brand}</span>
        <button
          type="button"
          aria-label={t("nav.closeMenu")}
          className="ml-auto inline-flex size-11 items-center justify-center rounded-lg text-[20px] leading-none text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:hidden"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
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
                "flex h-11 items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:h-9 md:text-[13px]",
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
              "flex h-11 items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:h-9 md:text-[13px]",
              pathname.startsWith("/team") && "bg-sidebar-accent text-foreground"
            )}
          >
            <NavIcon name="users" />
            {t("nav.team")}
          </Link>
        ) : null}
      </nav>
      <div className="border-t border-sidebar-border p-2">
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            className={cn(
              "flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:h-9 md:text-[13px]",
              pathname.startsWith("/settings") && "bg-sidebar-accent text-foreground"
            )}
          >
            <NavIcon name="gear" />
            {t("nav.settings")}
          </Link>
          <ThemeToggle />
        </div>
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
    </>
  );
}

function ThemeToggle() {
  const { t } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const dark = ready && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={dark ? t("settings.light") : t("settings.dark")}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:size-9"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3.5A8 8 0 1 0 20.5 13 6.2 6.2 0 0 1 16 3.5z" />
    </svg>
  );
}
