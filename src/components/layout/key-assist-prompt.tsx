"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fetchAssistRequests, type AssistRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { MemberFingerprintMismatch, helpMemberAccess, ignoredAssists, ignoreAssist, unlockOrganizationKey } from "@/lib/payload-crypto";
import { useAuthStore } from "@/stores/auth-store";

export function KeyAssistPrompt({ refreshKey = 0 }: { refreshKey?: number }) {
  const { t } = useI18n();
  const userId = useAuthStore((state) => state.user?.id);
  const [requests, setRequests] = useState<AssistRequest[]>([]);
  const [recovery, setRecovery] = useState("");
  const [failed, setFailed] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [fingerprint, setFingerprint] = useState("");
  const [pending, setPending] = useState(false);
  const current = requests[0];

  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    void fetchAssistRequests()
      .then((result) => {
        if (cancel) return;
        const skipped = ignoredAssists();
        setRequests(result.requests.filter((item) => !skipped.has(item.member_key_id)));
      })
      .catch(() => {
        if (!cancel) setRequests([]);
      });
    return () => {
      cancel = true;
    };
  }, [userId, refreshKey]);

  useEffect(() => {
    if (!current?.public_key) {
      setFingerprint("");
      return;
    }
    let cancel = false;
    void crypto.subtle.digest("SHA-256", Uint8Array.from(current.public_key.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [])).then((digest) => {
      if (cancel) return;
      setFingerprint([...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join(""));
    });
    return () => {
      cancel = true;
    };
  }, [current?.public_key]);

  function dismiss() {
    if (!current) return;
    ignoreAssist(current.member_key_id);
    setFailed(false);
    setRecovery("");
    setRequests((items) => items.slice(1));
  }

  async function agree() {
    if (!current) return;
    setPending(true);
    setFailed(false);
    setMismatch(false);
    try {
      if (recovery.trim()) await unlockOrganizationKey(recovery);
      setRecovery("");
      await helpMemberAccess(current);
      setRequests((items) => items.slice(1));
    } catch (error) {
      if (error instanceof MemberFingerprintMismatch) setMismatch(true);
      else setFailed(true);
    } finally {
      setPending(false);
    }
  }

  if (!current) return null;

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogTitle className="text-[15px] font-medium">{t("activity.assist", { name: current?.name ?? "" })}</DialogTitle>
        <DialogDescription className="sr-only">{t("activity.assist", { name: current?.name ?? "" })}</DialogDescription>
        {fingerprint ? <p className="mt-3 break-all font-mono text-[12px] text-muted-foreground">{fingerprint}</p> : null}
        {mismatch ? <p className="text-[13px] text-destructive">{t("activity.assistFingerprint")}</p> : null}
        {failed ? <p className="text-[13px] text-destructive">{t("activity.assistFailed")}</p> : null}
        <input aria-label={t("activity.assistRecovery")}
          className="mt-4 h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-[12px]"
          value={recovery}
          autoComplete="off"
          spellCheck={false}
          placeholder={t("activity.assistRecovery")}
          onChange={(event) => setRecovery(event.target.value.trim())}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={dismiss}>
            {t("activity.assistIgnore")}
          </Button>
          <Button disabled={pending} onClick={() => void agree()}>
            {t("activity.assistAgree")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
