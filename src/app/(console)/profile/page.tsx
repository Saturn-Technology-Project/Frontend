"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { PhotoField } from "@/components/account/photo-field";
import { EmailNotices } from "@/components/account/email-notices";
import { ReauthForm } from "@/components/account/reauth-form";
import { SignInSecurity } from "@/components/account/sign-in-security";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError, updatePersonalPhoto, updateProfile } from "@/lib/api";
import { changePasswordKeepingKey, confirmEmailChangeKeepingKey } from "@/lib/payload-crypto";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

export default function ProfilePage() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const { resolvedTheme, setTheme } = useTheme();
  const ready = useHydrated();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saved, setSaved] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [currentCode, setCurrentCode] = useState("");
  const [nextCode, setNextCode] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const dark = ready && resolvedTheme === "dark";

  // Follow the signed-in account into the form whenever it changes, unless an email change is waiting for a code.
  const [shownUser, setShownUser] = useState(user);
  const [shownPending, setShownPending] = useState(pendingEmail);
  if (user !== shownUser || pendingEmail !== shownPending) {
    setShownUser(user);
    setShownPending(pendingEmail);
    if (user && !pendingEmail) {
      setName(user.name);
      setEmail(user.email);
    }
  }

  const photo = useMutation({
    mutationFn: updatePersonalPhoto,
  });

  const save = useMutation({
    mutationFn: () => updateProfile({ name: name.trim(), email: email.trim() }),
    onSuccess: (next) => {
      setNeedsReauth(false);
      if (next.email_change_pending) {
        setPendingEmail(email.trim());
        setSaved(false);
        return;
      }
      setPendingEmail("");
      setSaved(true);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 403) setNeedsReauth(true);
    },
  });

  const confirmEmail = useMutation({
    mutationFn: () => confirmEmailChangeKeepingKey(currentCode, nextCode, emailPassword, pendingEmail),
    onSuccess: () => {
      setPendingEmail("");
      setCurrentCode("");
      setNextCode("");
      setEmailPassword("");
      setSaved(true);
    },
  });

  const password = useMutation({
    mutationFn: () => changePasswordKeepingKey(currentPassword, nextPassword),
    onSuccess: () => {
      setCurrentPassword("");
      setNextPassword("");
      setConfirm("");
      setPasswordSaved(true);
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSaved(false);
    save.mutate();
  }

  function submitPassword(event: FormEvent) {
    event.preventDefault();
    setPasswordSaved(false);
    if (nextPassword.length < 8) {
      setPasswordError(t("login.passwordShort"));
      return;
    }
    if (nextPassword !== confirm) {
      setPasswordError(t("login.passwordMismatch"));
      return;
    }
    setPasswordError("");
    password.mutate();
  }

  return (
    <div className="px-4 py-5 md:px-8 md:py-6">
      <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{t("profile.title")}</h1>
      <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">{t("profile.subtitle")}</p>

      <div className="mt-8 max-w-md">
        <PhotoField
          photo={user?.photo}
          name={user?.name || ""}
          canEdit
          pending={photo.isPending}
          onChange={(next) => photo.mutate(next)}
        />
        {photo.isError ? <p role="alert" className="mt-3 text-[13px] text-destructive">{photo.error.message}</p> : null}
      </div>

      <form onSubmit={submit} className="mt-8 max-w-md">
        <label className="block text-[12px] text-muted-foreground">
          {t("login.name")}
          <input value={name} onChange={(event) => { setSaved(false); setName(event.target.value); }} className={fieldClass} />
        </label>
        <label className="mt-4 block text-[12px] text-muted-foreground">
          {t("login.email")}
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => { setSaved(false); setEmail(event.target.value); }}
            className={fieldClass}
          />
        </label>
        {pendingEmail ? (
          <div className="mt-4">
            <p className="text-[13px] text-muted-foreground">{t("profile.emailChangeBody")}</p>
            <label className="mt-3 block text-[12px] text-muted-foreground">
              {t("profile.currentCode")}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={currentCode}
                maxLength={6}
                onChange={(event) => setCurrentCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className={fieldClass}
              />
            </label>
            <label className="mt-3 block text-[12px] text-muted-foreground">
              {t("profile.nextCode")}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={nextCode}
                maxLength={6}
                onChange={(event) => setNextCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className={fieldClass}
              />
            </label>
            <label className="mt-3 block text-[12px] text-muted-foreground">
              {t("profile.currentPassword")}
              <input
                type="password"
                autoComplete="current-password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                className={fieldClass}
              />
            </label>
            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{t("profile.emailPasswordHint")}</p>
            <Button
              type="button"
              className="mt-3"
              disabled={confirmEmail.isPending || currentCode.length !== 6 || nextCode.length !== 6}
              onClick={() => confirmEmail.mutate()}
            >
              {t("profile.confirmEnable")}
            </Button>
            {confirmEmail.isError ? (
              <p role="alert" className="mt-3 text-[13px] text-destructive">{confirmEmail.error.message}</p>
            ) : null}
          </div>
        ) : null}
        {needsReauth ? <ReauthForm busy={save.isPending} onReady={() => save.mutate()} /> : null}
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={save.isPending || !name.trim() || !email.trim()}>
            {t("profile.save")}
          </Button>
          {saved ? <span className="text-[13px] text-muted-foreground">{t("profile.saved")}</span> : null}
        </div>
        {save.isError && !(save.error instanceof ApiError && save.error.status === 403) ? (
          <p role="alert" className="mt-3 text-[13px] text-destructive">{save.error.message}</p>
        ) : null}
      </form>

      <form onSubmit={submitPassword} className="mt-10 max-w-md border-t border-border pt-8">
        <h2 className="text-[13px] font-medium">{t("profile.password")}</h2>
        <label className="mt-4 block text-[12px] text-muted-foreground">
          {t("profile.currentPassword")}
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => {
              setPasswordSaved(false);
              setCurrentPassword(event.target.value);
            }}
            className={fieldClass}
          />
        </label>
        <label className="mt-4 block text-[12px] text-muted-foreground">
          {t("login.newPassword")}
          <input
            type="password"
            autoComplete="new-password"
            value={nextPassword}
            onChange={(event) => {
              setPasswordSaved(false);
              setNextPassword(event.target.value);
            }}
            className={fieldClass}
          />
        </label>
        <label className="mt-4 block text-[12px] text-muted-foreground">
          {t("login.confirmPassword")}
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => {
              setPasswordSaved(false);
              setConfirm(event.target.value);
            }}
            className={fieldClass}
          />
        </label>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={password.isPending || !currentPassword || !nextPassword || !confirm}>
            {t("login.updatePassword")}
          </Button>
          {passwordSaved ? <span className="text-[13px] text-muted-foreground">{t("profile.passwordSaved")}</span> : null}
        </div>
        {passwordError ? <p role="alert" className="mt-3 text-[13px] text-destructive">{passwordError}</p> : null}
        {password.isError ? (
          <p role="alert" className="mt-3 text-[13px] text-destructive">
            {password.error instanceof ApiError ? password.error.message : t("common.apiError")}
          </p>
        ) : null}
      </form>

      <SignInSecurity />

      <EmailNotices />

      <section className="mt-10 max-w-md border-t border-border pt-8">
        <h2 className="text-[13px] font-medium">{t("settings.colorMode")}</h2>
        <div className="mt-3 grid max-w-xs grid-cols-2 gap-2">
          <ThemeChoice on={ready && !dark} onClick={() => setTheme("light")}>
            {t("settings.light")}
          </ThemeChoice>
          <ThemeChoice on={dark} onClick={() => setTheme("dark")}>
            {t("settings.dark")}
          </ThemeChoice>
        </div>
      </section>
    </div>
  );
}

function ThemeChoice({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg border text-[13px]",
        on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
