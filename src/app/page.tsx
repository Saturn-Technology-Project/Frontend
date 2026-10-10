"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionProbe } from "@/hooks/use-session";

export default function Home() {
  const router = useRouter();
  const { ready, signedIn } = useSessionProbe();

  useEffect(() => {
    if (!ready) return;
    router.replace(signedIn ? "/overview" : "/login");
  }, [ready, signedIn, router]);

  return <div className="min-h-screen bg-background" />;
}
