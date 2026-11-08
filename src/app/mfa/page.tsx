"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ReauthForm } from "@/components/account/reauth-form";
import { Button } from "@/components/ui/button";
import { useSessionProbe } from "@/hooks/use-session";
import { ApiError, confirmTotp, fetchMe, setupTotp } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";

export default function MfaSetupPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { ready, signedIn } = useSessionProbe();
  const required = useAuthStore((state) => state.user?.mfaSetupRequired);
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  // Setting up an authenticator needs a recent sign-in. Which step to retry once it is proved.
  const [stepUp, setStepUp] = useState<null | "start" | "confirm">(null);

  useEffect(() => {
    if (!ready) return;
    if (!signedIn) router.replace("/login?next=/mfa");
    else if (required === false) router.replace("/");
  }, [ready, signedIn, required, router]);

  async function start() {
    setError("");
    setPending(true);
    try {
      const setup = await setupTotp();
      setSecret(setup.secret);
      setOtpauthUrl(setup.otpauth_url);
      setBackupCodes(setup.backup_codes);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        setStepUp("start");
        return;
      }
      setError(caught instanceof Error ? caught.message : t("settings.mfaError"));
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    setError("");
    setPending(true);
    try {
      await confirmTotp(code.trim());
      await fetchMe();
      router.replace("/");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        setStepUp("confirm");
        return;
      }
      setError(caught instanceof Error ? caught.message : t("settings.mfaError"));
    } finally {
      setPending(false);
    }
  }

  if (!ready || !signedIn) return <div className="min-h-screen bg-background" />;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-[22px] font-medium tracking-tight">{t("settings.mfaTitle")}</h1>
      <p className="mt-2 text-[13px] text-muted-foreground">{t("settings.mfaLead")}</p>
      {stepUp ? (
        <div className="mt-6">
          <ReauthForm
            busy={pending}
            onReady={() => {
              const next = stepUp;
              setStepUp(null);
              void (next === "start" ? start() : confirm());
            }}
          />
        </div>
      ) : null}
      {secret ? (
        <div className="mt-6 space-y-4">
          <div>
            <div className="text-[12px] text-muted-foreground">{t("settings.mfaSecret")}</div>
            <p className="mt-1 break-all font-mono text-[13px]">{secret}</p>
            <p className="mt-1 break-all text-[12px] text-muted-foreground">{otpauthUrl}</p>
          </div>
          <div>
            <div className="text-[12px] text-muted-foreground">{t("settings.mfaBackup")}</div>
            <p className="mt-1 text-[12px] text-muted-foreground">{t("settings.mfaBackupNote")}</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 font-mono text-[13px]">
              {backupCodes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!code.trim()) return;
              void confirm();
            }}
          >
            <label className="block text-[12px] text-muted-foreground" htmlFor="totp-code">
              {t("settings.mfaCode")}
            </label>
            <input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-ring"
            />
            <Button type="submit" disabled={pending || code.trim().length < 6}>
              {t("settings.mfaConfirm")}
            </Button>
          </form>
        </div>
      ) : (
        <Button type="button" className="mt-6 w-fit" disabled={pending} onClick={() => void start()}>
          {t("settings.mfaStart")}
        </Button>
      )}
      {error ? <p className="mt-4 text-[13px] text-destructive">{error}</p> : null}
    </main>
  );
}
