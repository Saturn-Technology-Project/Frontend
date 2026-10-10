"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ApiError, changePassword, updateProfile } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

export default function ProfilePage() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const { resolvedTheme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const dark = ready && resolvedTheme === "dark";

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
  }, [user]);

  const save = useMutation({
    mutationFn: () => updateProfile({ name: name.trim(), email: email.trim() }),
    onSuccess: () => setSaved(true),
  });

  const password = useMutation({
    mutationFn: () => changePassword(currentPassword, nextPassword),
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
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={save.isPending || !name.trim() || !email.trim()}>
            {t("profile.save")}
          </Button>
          {saved ? <span className="text-[13px] text-muted-foreground">{t("profile.saved")}</span> : null}
        </div>
        {save.isError ? <p className="mt-3 text-[13px] text-destructive">{save.error.message}</p> : null}
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
        {passwordError ? <p className="mt-3 text-[13px] text-destructive">{passwordError}</p> : null}
        {password.isError ? (
          <p className="mt-3 text-[13px] text-destructive">
            {password.error instanceof ApiError ? password.error.message : t("common.apiError")}
          </p>
        ) : null}
      </form>

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
