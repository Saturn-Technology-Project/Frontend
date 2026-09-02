"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError, login } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, [setHydrated]);

  useEffect(() => {
    if (hydrated && token) {
      router.replace(searchParams.get("next") || "/overview");
    }
  }, [hydrated, token, router, searchParams]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(email.trim(), password);
      router.replace(searchParams.get("next") || "/overview");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? t("login.invalid")
          : t("common.apiError")
      );
    } finally {
      setPending(false);
    }
  }

  if (!hydrated || token) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-12 items-center justify-between border-b border-border px-5">
        <div className="text-[13px] font-medium tracking-[0.18em]">SATURN</div>
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.04em]">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={locale === "en" ? "text-foreground" : "text-muted-foreground"}
          >
            EN
          </button>
          <span className="text-border">/</span>
          <button
            type="button"
            onClick={() => setLocale("zh")}
            className={locale === "zh" ? "text-foreground" : "text-muted-foreground"}
          >
            中文
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <form onSubmit={onSubmit} className="w-full max-w-[360px]">
          <h1 className="text-[22px] font-medium tracking-tight">{t("login.title")}</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">{t("login.subtitle")}</p>

          <label className="mt-8 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("login.email")}
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring"
              required
            />
          </label>

          <label className="mt-4 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("login.password")}
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring"
              required
            />
          </label>

          {error ? <p className="mt-3 text-[12px] text-destructive">{error}</p> : null}

          <Button type="submit" className="mt-6 w-full" disabled={pending}>
            {pending ? t("login.signingIn") : t("login.submit")}
          </Button>
        </form>
      </main>
    </div>
  );
}
