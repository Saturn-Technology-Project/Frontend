"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthScreen } from "@/components/layout/auth-screen";
import { Button } from "@/components/ui/button";
import { useSessionProbe } from "@/hooks/use-session";
import { safeReturnPath } from "@/lib/return-path";
import { ApiError, registerAccount, requestSignupCode } from "@/lib/api";
import { unlockMemberKey } from "@/lib/payload-crypto";
import { useI18n } from "@/lib/i18n";

const fieldClass =
  "mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, signedIn } = useSessionProbe();
  const [step, setStep] = useState<"choose" | "form" | "confirm">("choose");
  const [team, setTeam] = useState(false);
  const [organization, setOrganization] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const next = safeReturnPath(searchParams.get("next"));
  const loginHref = next === "/overview" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  useEffect(() => {
    if (ready && signedIn) router.replace(next);
  }, [ready, signedIn, router, next]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await requestSignupCode(name.trim(), email.trim(), password);
      setStep("confirm");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError(t("login.emailUsed"));
      else if (err instanceof ApiError && err.status === 400 && /password/i.test(err.message)) setError(t("login.passwordShort"));
      else if (err instanceof ApiError) setError(err.message);
      else setError(t("common.apiError"));
    } finally {
      setPending(false);
    }
  }

  async function onConfirm(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await registerAccount(name.trim(), email.trim(), password, code.trim(), team ? organization.trim() : undefined);
      // A new account has no member key yet. Create it now, while the password is at hand.
      await unlockMemberKey(password).catch(() => undefined);
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError(t("login.emailUsed"));
      else if (err instanceof ApiError && err.status === 400) setError(t("login.codeInvalid"));
      else if (err instanceof ApiError) setError(err.message);
      else setError(t("common.apiError"));
    } finally {
      setPending(false);
    }
  }

  if (!ready || signedIn) {
    return <div className="min-h-screen bg-background" />;
  }

  if (step === "choose") {
    return (
      <AuthScreen>
        <h1 className="text-[22px] font-medium tracking-tight">{t("login.chooseTitle")}</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">{t("login.chooseBody")}</p>
        <div className="mt-8 space-y-3">
          <button
            type="button"
            className="w-full rounded-md border border-border px-4 py-4 text-left hover:border-foreground"
            onClick={() => { setTeam(false); setStep("form"); }}
          >
            <div className="text-[14px] font-medium">{t("login.personal")}</div>
            <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{t("login.personalBody")}</p>
          </button>
          <button
            type="button"
            className="w-full rounded-md border border-border px-4 py-4 text-left hover:border-foreground"
            onClick={() => { setTeam(true); setStep("form"); }}
          >
            <div className="text-[14px] font-medium">{t("login.team")}</div>
            <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{t("login.teamBody")}</p>
          </button>
        </div>
        <Link href={loginHref} className="mt-6 inline-flex h-8 items-center text-[13px] text-muted-foreground hover:text-foreground">
          {t("login.haveAccount")}
        </Link>
      </AuthScreen>
    );
  }

  if (step === "confirm") {
    return (
      <AuthScreen>
        <form onSubmit={onConfirm}>
          <h1 className="text-[22px] font-medium tracking-tight">{t("login.confirmTitle")}</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">{t("login.confirmBody")}</p>
          <label className="mt-8 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
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
          {error ? <p role="alert" className="mt-3 text-[12px] text-destructive">{error}</p> : null}
          <div className="mt-6 flex gap-2">
            <Button type="button" variant="outline" onClick={() => { setError(""); setStep("form"); }}>
              {t("login.back")}
            </Button>
            <Button type="submit" className="flex-1" disabled={pending || code.length !== 6}>
              {pending ? t("login.creating") : t("login.create")}
            </Button>
          </div>
        </form>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <form onSubmit={onSubmit}>
        <h1 className="text-[22px] font-medium tracking-tight">{t(team ? "login.team" : "login.personal")}</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">{t(team ? "login.teamBody" : "login.personalBody")}</p>
        {team ? (
          <label className="mt-8 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {t("login.organizationName")}
            <input
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              autoComplete="organization"
              maxLength={255}
              className={fieldClass}
              required
            />
          </label>
        ) : null}
        <label className={`${team ? "mt-4" : "mt-8"} block text-[11px] uppercase tracking-[0.08em] text-muted-foreground`}>
          {t("login.name")}
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={fieldClass} required />
        </label>
        <label className="mt-4 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("login.email")}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className={fieldClass}
            required
          />
        </label>
        <label className="mt-4 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("login.password")}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={fieldClass}
            required
          />
        </label>
        {error ? <p role="alert" className="mt-3 text-[12px] text-destructive">{error}</p> : null}
        <div className="mt-6 flex gap-2">
          <Button type="button" variant="outline" onClick={() => { setError(""); setStep("choose"); }}>
            {t("login.back")}
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? t("login.sendingCode") : t("login.sendCode")}
          </Button>
        </div>
        <Link href={loginHref} className="mt-4 inline-flex h-8 items-center text-[13px] text-muted-foreground hover:text-foreground">
          {t("login.haveAccount")}
        </Link>
      </form>
    </AuthScreen>
  );
}
