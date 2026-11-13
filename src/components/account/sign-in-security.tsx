"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ReauthForm } from "@/components/account/reauth-form";
import {
  ApiError,
  deletePasskey,
  disableEmailMfa,
  enableEmailMfa,
  fetchMfa,
  registerPasskey,
  requestEmailMfa,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const fieldClass =
  "mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

export function SignInSecurity() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stepUp, setStepUp] = useState<null | { kind: "email" } | { kind: "passkey"; id: string } | { kind: "add" }>(null);
  const status = useQuery({
    queryKey: ["mfa"],
    queryFn: fetchMfa,
  });

  function fail(err: unknown) {
    setMessage("");
    setError(err instanceof ApiError ? err.message : t("common.apiError"));
  }

  function retryStepUp() {
    if (!stepUp) return;
    const next = stepUp;
    setStepUp(null);
    if (next.kind === "email") disable.mutate();
    else if (next.kind === "add") add.mutate();
    else remove.mutate(next.id);
  }

  const send = useMutation({
    mutationFn: requestEmailMfa,
    onSuccess: () => {
      setError("");
      setSent(true);
    },
    onError: fail,
  });

  const enable = useMutation({
    mutationFn: () => enableEmailMfa(code.trim()),
    onSuccess: async () => {
      setCode("");
      setSent(false);
      setError("");
      setMessage(t("profile.emailOn"));
      await queryClient.invalidateQueries({ queryKey: ["mfa"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError && err.status === 400 ? t("login.codeInvalid") : t("common.apiError"));
    },
  });

  const disable = useMutation({
    mutationFn: disableEmailMfa,
    onSuccess: async () => {
      setStepUp(null);
      setError("");
      setMessage(t("profile.emailOff"));
      await queryClient.invalidateQueries({ queryKey: ["mfa"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 403) {
        setError("");
        setStepUp({ kind: "email" });
        return;
      }
      fail(err);
    },
  });

  const add = useMutation({
    mutationFn: registerPasskey,
    onSuccess: async () => {
      setStepUp(null);
      setError("");
      setMessage(t("profile.passkeyAdded"));
      await queryClient.invalidateQueries({ queryKey: ["mfa"] });
    },
    onError: (err) => {
      // Adding a passkey needs a recent sign-in, like removing one.
      if (err instanceof ApiError && err.status === 403) {
        setError("");
        setStepUp({ kind: "add" });
        return;
      }
      if (err instanceof ApiError) fail(err);
      else {
        setMessage("");
        setError(t("profile.passkeyUnsupported"));
      }
    },
  });

  const remove = useMutation({
    mutationFn: deletePasskey,
    onSuccess: async () => {
      setStepUp(null);
      setError("");
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: ["mfa"] });
    },
    onError: (err, id) => {
      if (err instanceof ApiError && err.status === 403) {
        setError("");
        setStepUp({ kind: "passkey", id });
        return;
      }
      fail(err);
    },
  });

  function confirm(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    enable.mutate();
  }

  const emailOn = status.data?.email_mfa ?? false;
  const passkeys = status.data?.passkeys ?? [];

  return (
    <section className="mt-10 max-w-md border-t border-border pt-8">
      <h2 className="text-[13px] font-medium">{t("profile.mfa")}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{t("profile.mfaBody")}</p>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px]">{t("profile.emailCode")}</span>
          <span className="text-[12px] text-muted-foreground">{emailOn ? t("profile.emailOn") : t("profile.emailOff")}</span>
        </div>
        {emailOn ? (
          <Button type="button" variant="outline" className="mt-3" disabled={disable.isPending} onClick={() => disable.mutate()}>
            {t("profile.disableEmail")}
          </Button>
        ) : sent ? (
          <form onSubmit={confirm} className="mt-3">
            <label className="block text-[12px] text-muted-foreground">
              {t("login.code")}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                maxLength={6}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className={fieldClass}
              />
            </label>
            <Button type="submit" className="mt-3" disabled={enable.isPending || code.length !== 6}>
              {t("profile.confirmEnable")}
            </Button>
          </form>
        ) : (
          <Button type="button" className="mt-3" disabled={send.isPending || status.isLoading} onClick={() => send.mutate()}>
            {t("profile.enableEmail")}
          </Button>
        )}
      </div>

      <div className="mt-6">
        <div className="text-[13px]">{t("profile.passkey")}</div>
        {passkeys.length > 0 ? <p className="mt-1 text-[12px] text-muted-foreground">{t("profile.passkeyBackup")}</p> : null}
        <ul className="mt-3 space-y-2">
          {passkeys.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="truncate text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
              <Button type="button" variant="outline" disabled={remove.isPending} onClick={() => remove.mutate(item.id)}>
                {t("profile.removePasskey")}
              </Button>
            </li>
          ))}
        </ul>
        {status.isSuccess && passkeys.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted-foreground">{t("profile.noPasskeys")}</p>
        ) : null}
        <Button type="button" variant="outline" className="mt-3" disabled={add.isPending} onClick={() => add.mutate()}>
          {t("profile.addPasskey")}
        </Button>
      </div>

      {stepUp ? <ReauthForm busy={disable.isPending || remove.isPending || add.isPending} onReady={retryStepUp} /> : null}
      {message ? <p className="mt-3 text-[13px] text-muted-foreground">{message}</p> : null}
      {error ? <p role="alert" className="mt-3 text-[13px] text-destructive">{error}</p> : null}
      {status.isError && !(status.error instanceof ApiError && status.error.status === 404) ? (
        <p role="alert" className="mt-3 text-[13px] text-destructive">
          {status.error instanceof ApiError ? status.error.message : t("common.apiError")}
        </p>
      ) : null}
    </section>
  );
}
