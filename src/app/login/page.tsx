"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthScreen } from "@/components/layout/auth-screen";
import { Button, buttonVariants } from "@/components/ui/button";
import { useSessionProbe } from "@/hooks/use-session";
import { ApiError, login, requestPasswordReset, resetPassword } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, signedIn } = useSessionProbe();
  const [mode, setMode] = useState<"sign-in" | "forgot" | "reset" | "done">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const next = searchParams.get("next");
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  useEffect(() => {
    if (ready && signedIn) router.replace(next || "/overview");
  }, [ready, signedIn, router, next]);

  function fail(err: unknown, fallback: string) {
    setError(err instanceof ApiError ? err.message : fallback);
  }

  async function onSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(email.trim(), password);
      router.replace(next || "/overview");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t("login.invalid") : t("common.apiError"));
    } finally {
      setPending(false);
    }
  }

  async function onForgot(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await requestPasswordReset(email.trim());
      setMode("reset");
    } catch (err) {
      fail(err, t("common.apiError"));
    } finally {
      setPending(false);
    }
  }

  async function onReset(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (nextPassword.length < 8) {
      setError(t("login.passwordShort"));
      return;
    }
    if (nextPassword !== confirm) {
      setError(t("login.passwordMismatch"));
      return;
    }
    setPending(true);
    try {
      await resetPassword(email.trim(), code.trim(), nextPassword);
      setPassword("");
      setMode("done");
    } catch (err) {
      fail(err, t("common.apiError"));
    } finally {
      setPending(false);
    }
  }

  if (!ready || signedIn) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <AuthScreen>
      {mode === "sign-in" ? (
        <form onSubmit={onSignIn}>
          <h1 className="text-[22px] font-medium tracking-tight">{t("login.title")}</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">{t("login.subtitle")}</p>
          <EmailField label={t("login.email")} value={email} onChange={setEmail} />
          <label className="mt-4 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("login.password")}
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
              required
            />
          </label>
          <button
            type="button"
            className="mt-3 text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => {
              setError("");
              setMode("forgot");
            }}
          >
            {t("login.forgot")}
          </button>
          {error ? <p className="mt-3 text-[12px] text-destructive">{error}</p> : null}
          <Button type="submit" className="mt-6 w-full" disabled={pending}>
            {pending ? t("login.signingIn") : t("login.submit")}
          </Button>
          <Link href={registerHref} className={cn(buttonVariants({ variant: "outline" }), "mt-2 w-full")}>
            {t("login.register")}
          </Link>
        </form>
      ) : null}

      {mode === "forgot" ? (
        <form onSubmit={onForgot}>
          <h1 className="text-[22px] font-medium tracking-tight">{t("login.forgot")}</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">{t("login.forgotBody")}</p>
          <EmailField label={t("login.email")} value={email} onChange={setEmail} />
          {error ? <p className="mt-3 text-[12px] text-destructive">{error}</p> : null}
          <Button type="submit" className="mt-6 w-full" disabled={pending}>
            {pending ? t("login.sendingCode") : t("login.sendCode")}
          </Button>
          <BackButton
            label={t("login.backToSignIn")}
            onClick={() => {
              setError("");
              setMode("sign-in");
            }}
          />
        </form>
      ) : null}

      {mode === "reset" ? (
        <form onSubmit={onReset}>
          <h1 className="text-[22px] font-medium tracking-tight">{t("login.updatePassword")}</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">{t("login.codeSent")}</p>
          <EmailField label={t("login.email")} value={email} onChange={setEmail} />
          <label className="mt-4 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("login.code")}
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className={fieldClass}
              required
            />
          </label>
          <PasswordField label={t("login.newPassword")} value={nextPassword} onChange={setNextPassword} autoComplete="new-password" />
          <PasswordField label={t("login.confirmPassword")} value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error ? <p className="mt-3 text-[12px] text-destructive">{error}</p> : null}
          <Button type="submit" className="mt-6 w-full" disabled={pending}>
            {pending ? t("login.updatingPassword") : t("login.updatePassword")}
          </Button>
          <BackButton
            label={t("login.backToSignIn")}
            onClick={() => {
              setError("");
              setMode("sign-in");
            }}
          />
        </form>
      ) : null}

      {mode === "done" ? (
        <div>
          <h1 className="text-[22px] font-medium tracking-tight">{t("login.updatePassword")}</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">{t("login.passwordUpdated")}</p>
          <Button type="button" className="mt-6 w-full" onClick={() => setMode("sign-in")}>
            {t("login.backToSignIn")}
          </Button>
        </div>
      ) : null}
    </AuthScreen>
  );
}

function EmailField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-8 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
      {label}
      <input
        type="email"
        autoComplete="username"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
        required
      />
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="mt-4 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
      {label}
      <input
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
        required
      />
    </label>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="mt-3 w-full text-center text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
