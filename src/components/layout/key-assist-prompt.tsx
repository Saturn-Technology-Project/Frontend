"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fetchAssistRequests, type AssistRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { helpMemberAccess, ignoredAssists, ignoreAssist } from "@/lib/payload-crypto";
import { useAuthStore } from "@/stores/auth-store";

export function KeyAssistPrompt() {
  const { t } = useI18n();
  const userId = useAuthStore((state) => state.user?.id);
  const [requests, setRequests] = useState<AssistRequest[]>([]);
  const [failed, setFailed] = useState(false);
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
  }, [userId]);

  function dismiss() {
    if (!current) return;
    ignoreAssist(current.member_key_id);
    setFailed(false);
    setRequests((items) => items.slice(1));
  }

  async function agree() {
    if (!current) return;
    setPending(true);
    setFailed(false);
    try {
      await helpMemberAccess(current);
      setRequests((items) => items.slice(1));
    } catch {
      setFailed(true);
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
        {failed ? <p className="text-[13px] text-destructive">{t("activity.assistFailed")}</p> : null}
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
