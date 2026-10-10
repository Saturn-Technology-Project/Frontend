"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSessionProbe } from "@/hooks/use-session";

export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, signedIn } = useSessionProbe();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready || signedIn) return;
    const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [ready, signedIn, pathname, router]);

  if (!ready || !signedIn) {
    return <div className="min-h-screen bg-background" />;
  }

  return <>{children}</>;
}
