"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { approveMemberKey, fetchPendingMemberKeys, rejectMemberKey, type PendingMemberKey } from "@/lib/api";
import { canAccess } from "@/lib/access";
import { fingerprintOf, formatFingerprint } from "@/lib/fingerprint";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";

/**
 * A member's new encryption key receives no payload keys until a team admin approves it.
 * Admins see each pending key with its fingerprint and decide, one at a time.
 */
export function KeyApprovalPrompt({ onDecided, onQueue }: { onDecided?: () => void; onQueue?: (count: number) => void }) {
  const { t } = useI18n();
  const userId = useAuthStore((state) => state.user?.id);
  const isAdmin = canAccess(useAuthStore((state) => state.user?.permissions), "team", "write");
  const [keys, setKeys] = useState<PendingMemberKey[]>([]);
  const [computed, setComputed] = useState<{ publicKey: string; fingerprint: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const current = keys[0];

  useEffect(() => {
    onQueue?.(keys.length);
  }, [keys.length, onQueue]);

  useEffect(() => {
    if (!userId || !isAdmin) return;
    let cancel = false;
    void fetchPendingMemberKeys()
      .then((result) => {
        if (!cancel) setKeys(result.keys.filter((item) => item.user_id !== userId));
      })
      .catch(() => {
        if (!cancel) setKeys([]);
      });
    return () => {
      cancel = true;
    };
  }, [userId, isAdmin]);

  useEffect(() => {
    const publicKey = current?.public_key;
    if (!publicKey) return;
    let cancel = false;
    // Recompute the fingerprint here rather than trusting the one the server sent.
    void fingerprintOf(publicKey)
      .then((fingerprint) => {
        if (!cancel) setComputed({ publicKey, fingerprint });
      })
      .catch(() => {
        // Not a key at all. With no fingerprint the Approve button stays off.
        if (!cancel) setComputed(null);
      });
    return () => {
      cancel = true;
    };
  }, [current?.public_key]);
  const local = computed && computed.publicKey === current?.public_key ? computed.fingerprint : "";

  async function decide(approve: boolean) {
    if (!current) return;
    setPending(true);
    setFailed(false);
    try {
      if (approve) await approveMemberKey(current.member_key_id);
      else await rejectMemberKey(current.member_key_id);
      setKeys((items) => items.slice(1));
      onDecided?.();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  // Escape and the close button mean "later": the key stays pending and is asked about again on
  // the next visit. Nothing is approved or rejected by closing.
  function later() {
    setFailed(false);
    setKeys((items) => items.slice(1));
  }

  if (!current) return null;
  // The server sends a shortened fingerprint (a prefix of the SHA-256); compare the same length.
  const mismatch = Boolean(local && current.fingerprint && local.slice(0, current.fingerprint.length) !== current.fingerprint);

  return (
    <Dialog
      open
      // A stray click outside must not skip a security decision; Escape and the close button do.
      disablePointerDismissal
      onOpenChange={(next) => {
        if (!next && !pending) later();
      }}
    >
      <DialogContent className="max-w-md" closeLabel={t("common.close")}>
        <DialogTitle className="pr-8 text-[15px] font-medium leading-5">
          {t("activity.keyApproval", { name: current.name, email: current.email })}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t("activity.keyApproval", { name: current.name, email: current.email })}
        </DialogDescription>
        {local ? (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 font-mono text-[13px] leading-6 tracking-wide">{formatFingerprint(local)}</p>
        ) : null}
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{t("activity.keyWhere")}</p>
        {mismatch ? <p role="alert" className="text-[13px] text-destructive">{t("activity.keyMismatch")}</p> : null}
        {failed ? <p role="alert" className="text-[13px] text-destructive">{t("activity.keyDecisionFailed")}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={later}>
            {t("activity.keyLater")}
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => void decide(false)}>
            {t("activity.keyReject")}
          </Button>
          <Button disabled={pending || mismatch || !local} onClick={() => void decide(true)}>
            {t("activity.keyApprove")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
