"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type MobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [shownPath, setShownPath] = useState(pathname);

  // Moving to another page closes the menu.
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setOpen(false);
  }

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

export const detailPanelClass =
  "sticky top-0 flex h-dvh w-[340px] shrink-0 flex-col overflow-y-auto overscroll-contain border-l border-border bg-card max-md:fixed max-md:inset-0 max-md:z-40 max-md:w-full max-md:border-l-0 max-md:pt-[env(safe-area-inset-top)] max-md:pb-[env(safe-area-inset-bottom)]";
