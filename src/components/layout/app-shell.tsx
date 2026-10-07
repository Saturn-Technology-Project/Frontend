"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { UpgradeCover } from "@/components/layout/upgrade-cover";
import { usePanelSocket } from "@/hooks/use-panel-socket";
import { useOrg } from "@/hooks/use-team";
import { useAuthStore } from "@/stores/auth-store";

export function AppShell({ children }: { children: ReactNode }) {
  usePanelSocket();
  const saved = useAuthStore((state) => state.org);
  const workspace = useOrg();
  const plan = workspace.data?.organization.plan ?? saved?.plan;
  const free = plan === "free" || plan === "trial";
  return (
    <div className="relative flex h-screen min-w-0 overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <Header />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
      {free ? <UpgradeCover /> : null}
    </div>
  );
}
