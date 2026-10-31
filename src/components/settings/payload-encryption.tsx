"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { createPayloadKey, fetchPayloadBackup, fetchPayloadKeys } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  bytesToHex,
  generateMlKem,
  hexToBytes,
  holdOrganizationKey,
  openRecoveryBackup,
  organizationKey,
  randomRecoveryKey,
  recoveryBackup,
} from "@/lib/payload-crypto";

export function PayloadEncryption() {
  const { t } = useI18n();
  const orgId = useAuthStore((state) => state.org?.id) ?? "";
  const client = useQueryClient();
  const status = useQuery({ queryKey: ["payload-keys"], queryFn: fetchPayloadKeys });
  const [recovery, setRecovery] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [unlock, setUnlock] = useState("");
  const [error, setError] = useState("");
  const [held, setHeld] = useState(organizationKey() !== null);

  const create = useMutation({
    mutationFn: async () => {
      const { publicKey, privateKey } = await generateMlKem();
      const secret = randomRecoveryKey();
      const backup = await recoveryBackup(secret, orgId, 1, privateKey);
      await createPayloadKey({ public_key: bytesToHex(publicKey), backup });
      holdOrganizationKey(privateKey, publicKey);
      setHeld(true);
      setRecovery(bytesToHex(secret));
      setSaved(false);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["payload-keys"] }),
    onError: () => setError(t("activity.revealFailed")),
  });

  async function restore() {
    setError("");
    try {
      const backup = await fetchPayloadBackup();
      const key = await openRecoveryBackup(hexToBytes(unlock), orgId, backup);
      const current = await fetchPayloadKeys();
      if (!current.public_key) throw new Error("organization public key is missing");
      holdOrganizationKey(key, hexToBytes(current.public_key));
      setHeld(true);
      setUnlock("");
    } catch {
      setError(t("activity.revealFailed"));
    }
  }

  if (status.isPending || status.isError || !status.data) return null;

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h2 className="text-[15px] font-medium">{t("settings.payloadTitle")}</h2>
      <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("settings.payloadHint")}</p>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {status.data?.encryption_status === "active"
          ? `${t("settings.payloadActive")} ${status.data.active_version}`
          : t("settings.payloadMissing")}
      </p>
      {status.data?.encryption_status !== "active" ? (
        <Button className="mt-4" disabled={create.isPending || !orgId} onClick={() => create.mutate()}>
          {t("settings.payloadCreate")}
        </Button>
      ) : null}
      {recovery ? (
        <div className="mt-4 max-w-xl">
          <p className="text-[13px] text-destructive">{t("settings.payloadRecovery")}</p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-[12px]">{recovery}</pre>
          <a
            className="mt-2 inline-block text-[13px] underline"
            href={`data:text/plain,${encodeURIComponent(recovery)}`}
            download="saturn-recovery-key.txt"
          >
            {t("settings.payloadRecovery")}
          </a>
          <label className="mt-3 flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />
            {t("settings.payloadSaved")}
          </label>
          {saved ? (
            <Button className="mt-3" variant="outline" onClick={() => setRecovery(null)}>
              {t("settings.payloadSaved")}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 flex max-w-xl gap-2">
        <input aria-label={t("settings.payloadRecovery")}
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 font-mono text-[12px]"
          value={unlock}
          autoComplete="off"
          spellCheck={false}
          placeholder={t("settings.payloadRecovery")}
          onChange={(event) => setUnlock(event.target.value.trim())}
        />
        <Button variant="outline" disabled={!unlock || !orgId} onClick={() => void restore()}>
          {t("settings.payloadUnlock")}
        </Button>
      </div>
      {held ? <p className="mt-2 text-[12px] text-muted-foreground">{t("settings.payloadActive")}</p> : null}
      {status.data?.own_member_key_approval === "pending" ? (
        <p className="mt-2 max-w-xl text-[13px] text-warning">{t("activity.ownKeyPending")}</p>
      ) : null}
      {status.data?.own_member_key_approval === "rejected" ? (
        <p className="mt-2 max-w-xl text-[13px] text-destructive">{t("activity.ownKeyRejected")}</p>
      ) : null}
      {error ? <p className="mt-2 text-[13px] text-destructive">{error}</p> : null}
      {status.data?.historical_note ? (
        <p className="mt-3 max-w-xl text-[12px] text-muted-foreground">{status.data.historical_note}</p>
      ) : null}
    </div>
  );
}
