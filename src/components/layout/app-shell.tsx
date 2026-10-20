"use client";

import { useState, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { KeyApprovalPrompt } from "@/components/layout/key-approval-prompt";
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
  const [approvals, setApprovals] = useState(0);
  const [assistRound, setAssistRound] = useState(0);
  return (
    <div className="relative flex h-dvh min-w-0 overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <Header />
        <main className={cn("min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)] md:pb-0", open && "max-md:overflow-hidden")}>
          {children}
        </main>
      </div>
      {/* Approve new member keys first; an approved key can then be helped to open older records. */}
      <KeyApprovalPrompt onQueue={setApprovals} onDecided={() => setAssistRound((round) => round + 1)} />
      {approvals === 0 ? <KeyAssistPrompt refreshKey={assistRound} /> : null}
    </div>
  );
}
