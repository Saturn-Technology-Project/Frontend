"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyBlock } from "@/components/ui/copy-block";
import { SectionLabel } from "@/components/ui/section-label";
import { StatusLabel } from "@/components/ui/status-dot";
import { useEnrollAgent, useEnrollment } from "@/hooks/use-console";
import { canAccess } from "@/lib/access";
import { agentConnected } from "@/lib/agent-presence";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { absoluteWsUrl, runtimeEnv } from "@/lib/ws";
import { usePanelStore } from "@/stores/panel-store";
import type { Agent } from "@/types";

export function AgentConnectPanel({ agent }: { agent: Agent }) {
  const { t } = useI18n();
  const live = usePanelStore((state) => state.agents);
  const heartbeatAt = usePanelStore((state) => state.heartbeats[agent.id] || agent.lastHeartbeatAt);
  const enroll = useEnrollAgent();
  const canWrite = canAccess(useAuthStore((state) => state.user?.permissions), "agents", "write");
  const connected = agentConnected(agent, live);
  const enrollment = useEnrollment(agent.id, canWrite);
  const credentials = enrollment.data ?? null;
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const enrolled = Boolean(credentials) || Boolean(agent.enrolled);
  const replaceToken = enrolled || connected;

  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [connected]);

  async function issueToken() {
    try {
      await enroll.mutateAsync(agent.id);
      setConfirmRotate(false);
    } catch {
      return;
    }
  }

  function onEnroll() {
    if (replaceToken && !confirmRotate) {
      setConfirmRotate(true);
      return;
    }
    void issueToken();
  }

  const waiting = enrolled && !connected;
  const wsUrl = credentials ? absoluteWsUrl(credentials.ws_url) : "";

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="flex items-start justify-between gap-6">
        <SectionLabel>{t("agents.runtime")}</SectionLabel>
        <StatusLabel
          tone={connected ? "connected" : waiting ? "pending" : "disconnected"}
          className={waiting ? "animate-pulse" : undefined}
        >
          {connected
            ? t("agents.connected")
            : waiting
              ? t("agents.waiting")
              : t("agents.offline")}
        </StatusLabel>
      </div>
      <p className="mt-3 max-w-md text-[13px] leading-6 text-muted-foreground">
        {t("agents.runtimeBody")}
      </p>

      {canWrite ? (
        <div className="mt-4">
          {confirmRotate ? (
            <p className="mb-3 max-w-md text-[12px] leading-5 text-muted-foreground">
              {t("agents.rotateConfirm")}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={confirmRotate || replaceToken ? "outline" : "default"}
              disabled={enroll.isPending}
              onClick={onEnroll}
            >
              {enroll.isPending
                ? t("agents.enrolling")
                : confirmRotate
                  ? t("agents.issueToken")
                  : replaceToken
                    ? t("agents.rotate")
                    : t("agents.enroll")}
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
          <p className="text-[12px] text-muted-foreground">{t("agents.tokenSaved")}</p>
          {connected ? (
            <p className="text-[13px] text-foreground">
              {t("agents.connectedHint")}
              {heartbeatAt ? (
                <span className="mt-1 block text-muted-foreground">
                  {t("agents.lastHeartbeat", {
                    n: Math.max(
                      0,
                      Math.round((now - Date.parse(heartbeatAt)) / 1000)
                    ),
                  })}
                </span>
              ) : null}
            </p>
          ) : waiting ? (
            <p className="text-[13px] text-muted-foreground">{t("agents.reconnecting")}</p>
          ) : null}
          <CopyBlock label={t("agents.websocket")} value={wsUrl} />
          <CopyBlock
            label={t("agents.environment")}
            value={runtimeEnv(credentials.agent_id, credentials.token)}
          />
        </div>
      ) : null}
    </section>
  );
}
