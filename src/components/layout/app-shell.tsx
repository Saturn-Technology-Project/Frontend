"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { usePanelSocket } from "@/hooks/use-panel-socket";

export function AppShell({ children }: { children: ReactNode }) {
  usePanelSocket();
  return (
    <div className="flex h-screen min-w-[1024px] flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
