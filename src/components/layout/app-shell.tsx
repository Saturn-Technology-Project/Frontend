"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { KeyAssistPrompt } from "@/components/layout/key-assist-prompt";
import { MobileNavProvider, useMobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MobileNavProvider>
      <Shell>{children}</Shell>
    </MobileNavProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
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
      <KeyAssistPrompt />
    </div>
  );
}
