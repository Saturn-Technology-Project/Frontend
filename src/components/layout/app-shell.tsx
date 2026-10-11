"use client";

"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { MobileNavProvider, useMobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { UpgradeCover } from "@/components/layout/upgrade-cover";
import { useOrg } from "@/hooks/use-team";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MobileNavProvider>
      <Shell>{children}</Shell>
    </MobileNavProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const saved = useAuthStore((state) => state.org);
  const workspace = useOrg();
  const plan = workspace.data?.organization.plan ?? saved?.plan;
  const free = plan === "free" || plan === "trial";
  const { open } = useMobileNav();
  return (
    <div className="relative flex h-dvh min-w-0 overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <Header />
        <main className={cn("min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)] md:pb-0", open && "max-md:overflow-hidden")}>
          {children}
        </main>
      </div>
      {free ? <UpgradeCover /> : null}
    </div>
  );
}
