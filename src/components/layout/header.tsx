"use client";

import { NavIcon } from "@/components/layout/nav-icon";
import { useMobileNav } from "@/components/layout/mobile-nav";
import { useI18n } from "@/lib/i18n";

export function Header() {
  const { t } = useI18n();
  const { open, setOpen } = useMobileNav();

  return (
    <header className="relative z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center border-b border-border bg-background px-3 pt-[env(safe-area-inset-top)] md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? t("nav.closeMenu") : t("nav.menu")}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
        onClick={() => setOpen(!open)}
      >
        <NavIcon name="menu" className="size-5" />
      </button>
    </header>
  );
}
