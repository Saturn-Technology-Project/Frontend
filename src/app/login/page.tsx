"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError, login, registerAccount } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";

function demoUrl() {
  const configured = process.env.NEXT_PUBLIC_LANDING_URL?.replace(/\/$/, "");
  if (configured) return `${configured}/demo`;
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:5173/demo";
  }
  return "https://saturn.technology/demo";
}

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
  const [registerOpen, setRegisterOpen] = useState(false);

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
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full"
            onClick={() => setRegisterOpen(true)}
          >
            {t("login.register")}
          </Button>
        </form>
      </main>
      {registerOpen ? (
        <RegisterDialog
          onClose={() => setRegisterOpen(false)}
          onCreated={() => router.replace(searchParams.get("next") || "/overview")}
        />
      ) : null}
    </div>
  );
}

function RegisterDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState<"choose" | "personal">("choose");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await registerAccount(name.trim(), email.trim(), password);
      onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError(t("login.emailUsed"));
      else if (err instanceof ApiError && err.status === 400) setError(t("login.passwordShort"));
      else setError(t("common.apiError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 px-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
        className="flex size-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border border-border bg-background p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="register-title" className="text-[18px] font-medium tracking-tight">
            {step === "choose" ? t("login.chooseTitle") : t("login.personal")}
          </h2>
          <button type="button" className="text-[12px] text-muted-foreground hover:text-foreground" onClick={onClose}>
            {t("login.close")}
          </button>
        </div>

        {step === "choose" ? (
          <div className="mt-4 grid flex-1 grid-rows-[auto_1fr_1fr] gap-3">
            <p className="text-[12px] text-muted-foreground">{t("login.chooseBody")}</p>
            <button
              type="button"
              className="rounded-md border border-border px-4 text-left hover:border-foreground"
              onClick={() => setStep("personal")}
            >
              <div className="text-[14px] font-medium">{t("login.personal")}</div>
              <p className="mt-1 text-[12px] text-muted-foreground">{t("login.personalBody")}</p>
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-4 text-left hover:border-foreground"
              onClick={() => {
                window.location.assign(demoUrl());
              }}
            >
              <div className="text-[14px] font-medium">{t("login.team")}</div>
              <p className="mt-1 text-[12px] text-muted-foreground">{t("login.teamBody")}</p>
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
            <p className="text-[12px] text-muted-foreground">{t("login.personalBody")}</p>
            <label className="mt-4 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {t("login.name")}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring"
                required
              />
            </label>
            <label className="mt-3 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {t("login.email")}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring"
                required
              />
            </label>
            <label className="mt-3 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {t("login.password")}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring"
                required
              />
            </label>
            {error ? <p className="mt-3 text-[12px] text-destructive">{error}</p> : null}
            <div className="mt-auto flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep("choose")}>
                {t("login.back")}
              </Button>
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? t("login.creating") : t("login.create")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
