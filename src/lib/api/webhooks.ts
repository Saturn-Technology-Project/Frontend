import { useAuthStore } from "@/lib/auth";
import { API_BASE, ApiError, apiErrorMessage, get, patch, post } from "./transport";

export interface WebhookEndpointRecord {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  has_secret: boolean;
  created_at: string;
  updated_at: string;
  secret?: string;
}

export interface WebhookAttemptRecord {
  id: string;
  status_code: number | null;
  error: string;
  created_at: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  event_type: string;
  event_id: string;
  status: string;
  attempt_count: number;
  last_status_code: number | null;
  last_error: string;
  created_at: string;
  updated_at: string;
  attempts: WebhookAttemptRecord[];
}

export function fetchWebhooks() {
  return get<WebhookEndpointRecord[]>("/org/webhooks");
}

export function createWebhook(body: { url: string; events: string[] }) {
  return post<WebhookEndpointRecord>("/org/webhooks", body);
}

export function updateWebhook(id: string, body: { url?: string; events?: string[]; enabled?: boolean }) {
  return patch<WebhookEndpointRecord>(`/org/webhooks/${id}`, body);
}

export function rotateWebhookSecret(id: string) {
  return post<{ secret: string }>(`/org/webhooks/${id}/rotate`);
}

export async function downloadWebhookSecret(id: string) {
  const headers = new Headers();
  const token = useAuthStore.getState().token;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}/org/webhooks/${id}/secret`, {
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    const parsed = await apiErrorMessage(response);
    throw new ApiError(response.status, parsed.message, parsed.migration);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `saturn-webhook-${id}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function testWebhook(id: string) {
  return post<WebhookDeliveryRecord>(`/org/webhooks/${id}/test`);
}

export function fetchWebhookDeliveries(id: string) {
  return get<WebhookDeliveryRecord[]>(`/org/webhooks/${id}/deliveries`);
}

export function retryWebhookDelivery(id: string) {
  return post<WebhookDeliveryRecord>(`/org/webhooks/deliveries/${id}/retry`);
}
