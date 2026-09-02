"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError, fetchMe } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export function AuthGate({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const pathname = usePathname();
  const router = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, [setHydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (token) return;
    setVerified(false);
    const next =
      pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [hydrated, token, pathname, router]);

  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;
    setVerified(false);
    fetchMe()
      .then(() => {
        if (!cancelled) setVerified(true);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setVerified(false);
          router.replace("/login");
          return;
        }
        setVerified(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, token, router]);

  if (!hydrated || !token || !verified) {
    return <div className="min-h-screen bg-background" />;
  }

  return <>{children}</>;
}
