"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { NavIcon } from "@/components/layout/nav-icon";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav() {
  const value = useContext(MobileNavContext);
  if (!value) throw new Error("useMobileNav must be used inside MobileNavProvider");
  return value;
}

const tabs = [
  { href: "/overview", key: "nav.home", icon: "home" },
  { href: "/tools", key: "nav.marketplace", icon: "grid" },
  { href: "/tools/connections", key: "nav.connections", icon: "link" },
  { href: "/agents", key: "nav.agents", icon: "bot" },
] as const;

function tabActive(pathname: string, href: string) {
  if (href === "/tools") return pathname === "/tools" || (pathname.startsWith("/tools/") && !pathname.startsWith("/tools/connections") && !pathname.startsWith("/tools/mapping"));
  if (href === "/overview") return pathname === "/overview";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { open, setOpen } = useMobileNav();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid h-16 grid-cols-5">
        {tabs.map((tab) => {
          const on = tabActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] text-muted-foreground",
                on && "text-foreground"
              )}
            >
              <NavIcon name={tab.icon} className="size-5 shrink-0" />
              <span className="max-w-full truncate">{t(tab.key)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? t("nav.closeMenu") : t("nav.menu")}
          onClick={() => setOpen(!open)}
          className={cn(
            "flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] text-muted-foreground",
            open && "text-foreground"
          )}
        >
          <NavIcon name="menu" className="size-5 shrink-0" />
          <span className="max-w-full truncate">{t("nav.menu")}</span>
        </button>
      </div>
    </nav>
  );
}

export const detailPanelClass =
  "sticky top-0 flex h-[calc(100dvh-3.5rem)] w-[340px] shrink-0 flex-col overflow-y-auto overscroll-contain border-l border-border bg-card max-md:fixed max-md:inset-0 max-md:z-40 max-md:h-dvh max-md:w-full max-md:border-l-0 max-md:pt-[env(safe-area-inset-top)] max-md:pb-[env(safe-area-inset-bottom)]";
