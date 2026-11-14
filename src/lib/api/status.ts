import type { StatusHistory, StatusReport } from "@/lib/status-page";
import { request } from "./transport";

// Both are read without a session: the status page is public, and a signed-out visitor
// must not be sent to the sign-in page for looking at it.
export function fetchStatus() {
  return request<StatusReport>("/status", undefined, false);
}

export function fetchStatusHistory() {
  return request<StatusHistory>("/status/history", undefined, false);
}
