"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ApiError, logout } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { attachKeyUnlockDialog, keyUnlockRequested, settleKeyUnlock, subscribeKeyUnlock } from "@/lib/key-unlock";
import { MemberKeyPasswordError, reopenMemberKey } from "@/lib/payload-crypto";

const fieldClass =
  "mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

/**
 * Asks for the password when something needs the member key and it is not in memory: after a
 * reload, or in a tab that never signed in with the password. It opens only on demand, and the
 * password goes no further than deriving the key in this tab.
 */
export function KeyUnlockDialog() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const open = useSyncExternalStore(subscribeKeyUnlock, keyUnlockRequested, () => false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<"" | "wrong" | "missing" | "failed">("");
  const [pending, setPending] = useState(false);

  useEffect(() => attachKeyUnlockDialog(), []);

  function close(unlocked: boolean) {
    setPassword("");
    setError("");
    settleKeyUnlock(unlocked);
  }

  // The way out when the password will not open the key: a password sign-in repairs it.
  async function signOut() {
    close(false);
    await logout().catch(() => logout().catch(() => undefined));
    queryClient.clear();
    router.replace("/login");
  }

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await reopenMemberKey(password);
      close(true);
    } catch (caught) {
      if (caught instanceof MemberKeyPasswordError) setError("wrong");
      else if (caught instanceof ApiError && caught.status === 404) setError("missing");
      else setError("failed");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <Dialog
      open
      // A click outside must not throw away a half-typed password.
      disablePointerDismissal
      onOpenChange={(next) => {
        if (!next && !pending) close(false);
      }}
    >
      <DialogContent className="max-w-md" closeLabel={t("common.close")}>
        <DialogTitle className="pr-8 text-[15px] font-medium leading-5">{t("keyUnlock.title")}</DialogTitle>
        <DialogDescription className="text-[13px] leading-5">{t("keyUnlock.body")}</DialogDescription>
        <form onSubmit={unlock}>
          <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
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
          {error ? (
            <p role="alert" className="mt-3 text-[13px] text-destructive">
              {error === "wrong" ? t("keyUnlock.wrong") : error === "missing" ? t("keyUnlock.missing") : t("common.apiError")}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {error === "wrong" || error === "missing" ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="mr-auto"
                onClick={() => void signOut()}
              >
                {t("login.signOut")}
              </Button>
            ) : null}
            <Button type="button" variant="outline" disabled={pending} onClick={() => close(false)}>
              {t("keyUnlock.later")}
            </Button>
            <Button type="submit" disabled={pending || !password}>
              {pending ? t("keyUnlock.pending") : t("keyUnlock.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
