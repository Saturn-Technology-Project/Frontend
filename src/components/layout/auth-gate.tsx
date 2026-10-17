"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSessionProbe } from "@/hooks/use-session";
import { useAuthStore } from "@/stores/auth-store";

export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, signedIn } = useSessionProbe();
  const mfaSetupRequired = useAuthStore((state) => state.user?.mfaSetupRequired);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready || signedIn) return;
    const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [ready, signedIn, pathname, router]);

  useEffect(() => {
    if (!ready || !signedIn || !mfaSetupRequired) return;
    router.replace("/mfa");
  }, [ready, signedIn, mfaSetupRequired, router]);

  if (!ready || !signedIn || mfaSetupRequired) {
    return <div className="min-h-screen bg-background" />;
  }

  return <>{children}</>;
}
