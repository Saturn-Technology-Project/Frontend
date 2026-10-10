"use client";

import { useEffect, useState } from "react";
import { restoreSession } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export function useSessionProbe() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const user = useAuthStore((state) => state.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, [setHydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    restoreSession().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  return { ready, signedIn: ready && Boolean(user) };
}
