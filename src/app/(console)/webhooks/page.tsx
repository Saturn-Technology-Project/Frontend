"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createWebhook,
  downloadWebhookSecret,
  fetchApprovalWindow,
  fetchWebhookDeliveries,
  fetchWebhooks,
  retryWebhookDelivery,
  rotateWebhookSecret,
  testWebhook,
  updateApprovalWindow,
  updateWebhook,
  type WebhookDeliveryRecord,
} from "@/lib/api";
import { useEntitlements } from "@/hooks/use-entitlements";
import { canAccess } from "@/lib/access";
import { useAuthStore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const fieldClass =
  "mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring";

const EVENT_FORMAT = `Saturn-Webhook-Id: whe_0123abcd
Saturn-Webhook-Timestamp: 1791763200
Saturn-Webhook-Signature: v1=<hex HMAC-SHA256 of "1791763200.{body}">
Content-Type: application/json

{
  "created_at": "2026-10-12T00:00:00+00:00",
  "data": {
    "action_id": "act_0123abcd",
    "approval_id": "approval_0123abcd",
    "expires_at": "2026-10-13T00:00:00+00:00",
    "phase": null,
    "resubmit_expires_at": "2026-10-13T00:00:00+00:00",
    "run_id": "run_0123abcd",
    "status": "approved",
    "tool": "pay.send"
  },
  "id": "whe_0123abcd",
  "schema": "saturn.webhook.v1",
  "type": "approval.granted"
}`;

const EVENTS = [
  ["approval.granted", "webhooks.granted"],
  ["approval.rejected", "webhooks.rejected"],
  ["approval.expired", "webhooks.expired"],
] as const;

export default function WebhooksPage() {
  const { t } = useI18n();
  const canWrite = canAccess(useAuthStore((state) => state.user?.permissions), "team", "write");
  const { webhooks: webhookAccess } = useEntitlements();
  const client = useQueryClient();
  const endpoints = useQuery({ queryKey: ["webhooks"], queryFn: fetchWebhooks, enabled: webhookAccess });
  const approvalWindow = useQuery({ queryKey: ["approval-window"], queryFn: fetchApprovalWindow });
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(EVENTS.map(([value]) => value));
  const [secret, setSecret] = useState("");
  const [pendingMinutes, setPendingMinutes] = useState("");
  const [resubmitMinutes, setResubmitMinutes] = useState("");

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["webhooks"] });
  };
  const create = useMutation({
    mutationFn: createWebhook,
    onSuccess: async (row) => {
      setSecret(row.secret ?? "");
      setUrl("");
      await refresh();
    },
  });
  const saveWindow = useMutation({
    mutationFn: updateApprovalWindow,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["approval-window"] });
    },
  });

  const pendingValue = pendingMinutes || String(approvalWindow.data?.pending_ttl_minutes ?? "");
  const resubmitValue = resubmitMinutes || String(approvalWindow.data?.resubmit_ttl_minutes ?? "");
  const failed = endpoints.error instanceof ApiError ? endpoints.error.message : t("webhooks.failed");

  function toggleEvent(value: string) {
    setEvents((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!canWrite || events.length === 0) return;
    create.mutate({ url, events });
  }

  return (
    <div className="px-4 py-6 md:px-10 md:py-8">
      <h1 className="text-[26px] font-semibold tracking-tight">{t("webhooks.title")}</h1>
      <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("webhooks.subtitle")}</p>

      <section className="mt-8 max-w-3xl">
        <h2 className="text-[15px] font-medium">{t("webhooks.formatTitle")}</h2>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("webhooks.formatLead")}</p>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("webhooks.signatureLead")}</p>
        <pre className="mt-4 overflow-x-auto border border-border bg-muted/40 p-4 font-mono text-[12px] leading-5">{EVENT_FORMAT}</pre>
      </section>

      <form
        className="mt-8 max-w-xl border-t border-border py-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canWrite) return;
          saveWindow.mutate({
            pending_ttl_minutes: Number(pendingValue),
            resubmit_ttl_minutes: Number(resubmitValue),
          });
        }}
      >
        <div className="text-[13px] text-muted-foreground">{t("webhooks.window")}</div>
        <p className="mt-1 text-[12px] text-muted-foreground">{t("webhooks.windowHint")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[13px]">
            {t("webhooks.pendingTtl")}
            <input
              className={fieldClass}
              inputMode="numeric"
              value={pendingValue}
              onChange={(event) => setPendingMinutes(event.target.value)}
              disabled={!canWrite}
            />
          </label>
          <label className="text-[13px]">
            {t("webhooks.resubmitTtl")}
            <input
              className={fieldClass}
              inputMode="numeric"
              value={resubmitValue}
              onChange={(event) => setResubmitMinutes(event.target.value)}
              disabled={!canWrite}
            />
          </label>
        </div>
        {canWrite ? (
          <Button className="mt-4" type="submit" disabled={saveWindow.isPending}>
            {t("webhooks.save")}
          </Button>
        ) : null}
        {saveWindow.isError ? <p className="mt-2 text-[13px] text-destructive">{saveWindow.error.message}</p> : null}
      </form>

      {webhookAccess ? (
        <>
          {canWrite ? (
            <form className="max-w-xl border-t border-border py-5" onSubmit={onCreate}>
              <label className="text-[13px]">
                {t("webhooks.url")}
                <input className={fieldClass} value={url} onChange={(event) => setUrl(event.target.value)} required />
              </label>
              <div className="mt-4 text-[13px]">{t("webhooks.events")}</div>
              <div className="mt-2 flex flex-wrap gap-4 text-[13px]">
                {EVENTS.map(([value, key]) => (
                  <label key={value} className="flex items-center gap-2">
                    <input type="checkbox" checked={events.includes(value)} onChange={() => toggleEvent(value)} />
                    {t(key)}
                  </label>
                ))}
              </div>
              <Button className="mt-4" type="submit" disabled={create.isPending || events.length === 0}>
                {t("webhooks.create")}
              </Button>
              {create.isError ? <p className="mt-2 text-[13px] text-destructive">{create.error.message}</p> : null}
            </form>
          ) : null}

          {secret ? (
            <p className="max-w-xl border border-border px-4 py-3 font-mono text-[12px] break-all">
              {t("webhooks.secretOnce")}
              <span className="mt-2 block">{secret}</span>
            </p>
          ) : null}

          {endpoints.isError ? <p className="mt-6 text-[13px] text-muted-foreground">{failed}</p> : null}
          {!endpoints.isPending && (endpoints.data?.length ?? 0) === 0 && !endpoints.isError ? (
            <p className="mt-6 text-[13px] text-muted-foreground">{t("webhooks.empty")}</p>
          ) : null}
          <ul className="mt-4 max-w-3xl space-y-4">
            {(endpoints.data ?? []).map((endpoint) => (
              <EndpointCard key={endpoint.id} id={endpoint.id} url={endpoint.url} events={endpoint.events} enabled={endpoint.enabled} canWrite={canWrite} onSecret={setSecret} />
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-8 max-w-xl">
          <UpgradePrompt />
        </div>
      )}
    </div>
  );
}

function EndpointCard({
  id,
  url,
  events,
  enabled,
  canWrite,
  onSecret,
}: {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  canWrite: boolean;
  onSecret: (secret: string) => void;
}) {
  const { t } = useI18n();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const deliveries = useQuery({
    queryKey: ["webhook-deliveries", id],
    queryFn: () => fetchWebhookDeliveries(id),
    enabled: open,
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["webhooks"] });
    await client.invalidateQueries({ queryKey: ["webhook-deliveries", id] });
  };
  const [downloadError, setDownloadError] = useState("");
  const toggle = useMutation({ mutationFn: () => updateWebhook(id, { enabled: !enabled }), onSuccess: refresh });
  const rotate = useMutation({
    mutationFn: () => rotateWebhookSecret(id),
    onSuccess: async (row) => {
      onSecret(row.secret);
      await refresh();
    },
  });
  const test = useMutation({ mutationFn: () => testWebhook(id), onSuccess: refresh });
  const retry = useMutation({ mutationFn: retryWebhookDelivery, onSuccess: refresh });

  return (
    <li className="border border-border px-4 py-4">
      <div className="break-all text-[14px]">{url}</div>
      <div className="mt-1 text-[12px] text-muted-foreground">{events.join(", ")}</div>
      <p className="mt-2 text-[12px] text-muted-foreground">{t("webhooks.secretStable")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {canWrite ? (
          <>
            <Button variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate()}>
              {enabled ? t("webhooks.enabled") : t("webhooks.disabled")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDownloadError("");
                downloadWebhookSecret(id).catch((error: unknown) => {
                  setDownloadError(error instanceof Error ? error.message : t("webhooks.failed"));
                });
              }}
            >
              {t("webhooks.download")}
            </Button>
            <Button variant="outline" disabled={rotate.isPending} onClick={() => rotate.mutate()}>
              {t("webhooks.rotate")}
            </Button>
            <Button variant="outline" disabled={test.isPending || !enabled} onClick={() => test.mutate()}>
              {t("webhooks.test")}
            </Button>
          </>
        ) : null}
        <Button variant="outline" onClick={() => setOpen((current) => !current)}>
          {t("webhooks.deliveries")}
        </Button>
      </div>
      {downloadError ? <p className="mt-2 text-[12px] text-destructive">{downloadError}</p> : null}
      {open ? (
        <DeliveryList
          rows={deliveries.data ?? []}
          empty={deliveries.isPending ? "" : t("webhooks.noDeliveries")}
          canWrite={canWrite}
          pending={retry.isPending}
          onRetry={(deliveryId) => retry.mutate(deliveryId)}
        />
      ) : null}
    </li>
  );
}

function DeliveryList({
  rows,
  empty,
  canWrite,
  pending,
  onRetry,
}: {
  rows: WebhookDeliveryRecord[];
  empty: string;
  canWrite: boolean;
  pending: boolean;
  onRetry: (id: string) => void;
}) {
  const { t } = useI18n();
  if (rows.length === 0) return empty ? <p className="mt-3 text-[12px] text-muted-foreground">{empty}</p> : null;
  return (
    <ul className="mt-4 space-y-3">
      {rows.map((row) => (
        <li key={row.id} className="border-t border-border pt-3 text-[12px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {row.event_type} · {row.status}
              {row.last_status_code ? ` · ${row.last_status_code}` : ""}
            </span>
            {canWrite && row.status !== "delivered" ? (
              <Button variant="outline" disabled={pending} onClick={() => onRetry(row.id)}>
                {t("webhooks.retry")}
              </Button>
            ) : null}
          </div>
          <div className="mt-1 font-mono text-muted-foreground">{row.event_id}</div>
          <div className="mt-1 text-muted-foreground">
            {t("webhooks.attempts")} {row.attempt_count} · {row.created_at}
          </div>
          {row.last_error ? <div className="mt-1 text-destructive">{row.last_error}</div> : null}
          {row.attempts.length > 0 ? (
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {row.attempts.map((attempt) => (
                <li key={attempt.id}>
                  {attempt.created_at} · {attempt.status_code ?? "—"} {attempt.error}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
