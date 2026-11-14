"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/components/layout/auth-screen";
import { Button } from "@/components/ui/button";
import { useSessionProbe } from "@/hooks/use-session";
import { ApiError, acceptInvite } from "@/lib/api";
import { readInviteLink, type InviteLink } from "@/lib/invite-link";
import { unlockMemberKey } from "@/lib/payload-crypto";
import { useI18n } from "@/lib/i18n";

const fieldClass =
  "mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

export default function AcceptInvitePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { ready, signedIn } = useSessionProbe();
  // Null until the link has been read. The token then lives only here, in memory.
  const [invite, setInvite] = useState<InviteLink | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function read() {
      const found = readInviteLink(window.location.search, window.location.hash);
      // A link with a token replaces what is held. A read that finds none keeps it: React runs
      // this twice in development, and the second run sees the address already cleaned.
      setInvite((current) => (found.token || !current ? found : current));
      // Take the token out of the address bar and the history entry, so it is not copied,
      // bookmarked or read back from the URL by anything that loads later.
      if (window.location.search || window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    read();
    // Opening a "#token=…" link while this page is already showing changes only the fragment,
    // which does not load the page again.
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

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
      await acceptInvite(invite?.token ?? "", password, invite?.email ?? "");
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

  if (!ready || signedIn || !invite) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!invite.token || !invite.email) {
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
          <input type="email" autoComplete="username" value={invite.email} readOnly className={`${fieldClass} opacity-80`} />
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
