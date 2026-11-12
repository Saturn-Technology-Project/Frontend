"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fetchAssistRequests, type AssistRequest } from "@/lib/api";
import { fingerprintOf, formatFingerprint } from "@/lib/fingerprint";
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
  const [digest, setDigest] = useState<{ key: string; fingerprint: string } | null>(null);
  const [pending, setPending] = useState(false);
  // Which request the helper confirmed out of band. Helping hands this key every record, so the
  // server's own list is not proof enough that the key belongs to the colleague.
  const [confirmedKey, setConfirmedKey] = useState("");
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

  // The fingerprint is kept with the key it was computed from, so a stale one is never shown for the next request.
  const publicKey = current?.public_key ?? "";
  const fingerprint = digest?.key === publicKey ? digest.fingerprint : "";
  const confirmed = Boolean(current) && confirmedKey === current?.member_key_id;
  useEffect(() => {
    if (!publicKey) return;
    let cancel = false;
    // Computed here from the key the server sent, the same way the member's own browser computes theirs.
    void fingerprintOf(publicKey)
      .then((value) => {
        if (!cancel) setDigest({ key: publicKey, fingerprint: value });
      })
      .catch(() => {
        // Not a key at all. With no fingerprint the confirmation and Agree stay off.
        if (!cancel) setDigest(null);
      });
    return () => {
      cancel = true;
    };
  }, [publicKey]);

  function dismiss() {
    if (!current) return;
    ignoreAssist(current.member_key_id);
    setFailed(false);
    setRecovery("");
    setRequests((items) => items.slice(1));
  }

  async function agree() {
    if (!current || !confirmed || !fingerprint) return;
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
        {fingerprint ? (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 font-mono text-[13px] leading-6 tracking-wide">{formatFingerprint(fingerprint)}</p>
        ) : null}
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{t("activity.keyWhere")}</p>
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
        <label className="mt-4 flex items-start gap-2 text-[13px]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={confirmed}
            disabled={!fingerprint}
            onChange={(event) => setConfirmedKey(event.target.checked && current ? current.member_key_id : "")}
          />
          <span>{t("activity.assistConfirm", { name: current?.name ?? "" })}</span>
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={dismiss}>
            {t("activity.assistIgnore")}
          </Button>
          <Button disabled={pending || !confirmed || !fingerprint} onClick={() => void agree()}>
            {t("activity.assistAgree")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
