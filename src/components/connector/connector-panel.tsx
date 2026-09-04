"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyBlock } from "@/components/ui/copy-block";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import {
  useConnectorEnrollment,
  useEnrollConnector,
} from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  absoluteWsUrl,
  connectorEnrollCommand,
  connectorEnv,
} from "@/lib/ws";
import { usePanelStore } from "@/stores/panel-store";
import type { Connector } from "@/types";

export function ConnectorPanel({
  connector,
}: {
  connector: Connector | null;
}) {
  const { t } = useI18n();
  const liveConnected = usePanelStore((state) => state.connectorConnected);
  const enroll = useEnrollConnector();
  const canWrite = canAccess(
    useAuthStore((state) => state.user?.permissions),
    "agents",
    "write"
  );
  const enrolled = Boolean(connector?.enrolled);
  const connected = liveConnected || Boolean(connector?.connected);
  const enrollment = useConnectorEnrollment(canWrite && enrolled && !connected);
  const credentials = enrollment.data ?? null;
  const [confirmRotate, setConfirmRotate] = useState(false);

  async function issueToken() {
    try {
      await enroll.mutateAsync();
      setConfirmRotate(false);
    } catch {
      return;
    }
  }

  function onEnroll() {
    if ((enrolled || connected) && !confirmRotate) {
      setConfirmRotate(true);
      return;
    }
    void issueToken();
  }

  if (connected) return null;

  const waiting = enrolled && !connected;
  const wsUrl = credentials ? absoluteWsUrl(credentials.ws_url) : "";
  const tone = waiting ? "pending" : "disconnected";

  return (
    <section className="max-w-[640px]">
      <div className="flex items-start justify-between gap-6">
        <SectionLabel>{t("connector.title")}</SectionLabel>
        <StatusLabel tone={tone} className={waiting ? "animate-pulse" : undefined}>
          {waiting ? t("connector.waiting") : t("connector.offline")}
        </StatusLabel>
      </div>
      <p className="mt-3 max-w-md text-[13px] leading-6 text-muted-foreground">
        {t("connector.body")}
      </p>

      {canWrite ? (
        <div className="mt-4">
          {confirmRotate ? (
            <p className="mb-3 max-w-md text-[12px] leading-5 text-muted-foreground">
              {t("connector.rotateConfirm")}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={confirmRotate || enrolled ? "outline" : "default"}
              disabled={enroll.isPending}
              onClick={onEnroll}
            >
              {enroll.isPending
                ? t("connector.enrolling")
                : confirmRotate
                  ? t("connector.issueToken")
                  : enrolled
                    ? t("connector.rotate")
                    : t("connector.connect")}
            </Button>
            {confirmRotate ? (
              <Button
                type="button"
                variant="ghost"
                disabled={enroll.isPending}
                onClick={() => setConfirmRotate(false)}
              >
                {t("agents.cancel")}
              </Button>
            ) : null}
          </div>
          {enroll.isError || enrollment.isError ? (
            <p className="mt-2 text-[13px] text-destructive">{t("common.requestFailed")}</p>
          ) : null}
        </div>
      ) : null}

      {credentials ? (
        <div className="mt-6 space-y-5">
          <p className="text-[12px] text-muted-foreground">{t("connector.tokenSaved")}</p>
          {waiting ? (
            <p className="text-[13px] text-muted-foreground">{t("connector.reconnecting")}</p>
          ) : null}
          <CopyBlock label={t("agents.websocket")} value={wsUrl} />
          <CopyBlock
            label={t("agents.environment")}
            value={connectorEnv(credentials.connector_id, credentials.token)}
          />
          <CopyBlock
            label={t("connector.enrollLocal")}
            value={connectorEnrollCommand(credentials.connector_id, credentials.token)}
          />
        </div>
      ) : null}
    </section>
  );
}
