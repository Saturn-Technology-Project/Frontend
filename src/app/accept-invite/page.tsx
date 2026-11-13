"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthScreen } from "@/components/layout/auth-screen";
import { Button } from "@/components/ui/button";
import { useSessionProbe } from "@/hooks/use-session";
import { ApiError, acceptInvite } from "@/lib/api";
import { unlockMemberKey } from "@/lib/payload-crypto";
import { useI18n } from "@/lib/i18n";

const fieldClass =
  "mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AcceptInviteForm />
    </Suspense>
  );
}

function AcceptInviteForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, signedIn } = useSessionProbe();
  const token = searchParams.get("token") ?? "";
  // The password hash is salted with the address, so it must be the one the invite was sent to.
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ready && signedIn) router.replace("/overview");
  }, [ready, signedIn, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("login.passwordShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("login.passwordMismatch"));
      return;
    }
    setPending(true);
    try {
      await acceptInvite(token, password, email);
      await unlockMemberKey(password).catch(() => undefined);
      router.replace("/overview");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 404 || err.status === 409 || err.status === 410)) {
        setError(t("invite.invalid"));
      } else if (err instanceof ApiError && err.status === 429) {
        setError(err.message);
      } else {
        setError(t("common.apiError"));
      }
    } finally {
      setPending(false);
    }
  }

  if (!ready || signedIn) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!token || !email) {
    return (
      <AuthScreen>
        <h1 className="text-[22px] font-medium tracking-tight">{t("invite.title")}</h1>
        <p role="alert" className="mt-2 text-[13px] text-destructive">{t("invite.missing")}</p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <form onSubmit={onSubmit}>
        <h1 className="text-[22px] font-medium tracking-tight">{t("invite.title")}</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">{t("invite.body")}</p>
        <label className="mt-8 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("invite.email")}
          <input type="email" autoComplete="username" value={email} readOnly className={`${fieldClass} opacity-80`} />
        </label>
        <label className="mt-4 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("invite.password")}
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
            required
          />
        </label>
        <label className="mt-4 block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {t("invite.confirm")}
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={fieldClass}
            required
          />
        </label>
        {error ? <p role="alert" className="mt-3 text-[12px] text-destructive">{error}</p> : null}
        <Button type="submit" className="mt-6 w-full" disabled={pending}>
          {pending ? t("invite.submitting") : t("invite.submit")}
        </Button>
      </form>
    </AuthScreen>
  );
}
