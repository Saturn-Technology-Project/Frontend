import { useAuthStore } from "@/lib/auth";

export const API_BASE = "/saturn-api";

export class ApiError extends Error {
  status: number;
  migration?: "v1" | "password";

  constructor(status: number, message: string, migration?: "v1" | "password") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.migration = migration;
  }
}

function isSafeErrorText(value: string) {
  const text = value.trim();
  if (!text || text.length > 280) return false;
  if (text.startsWith("<")) return false;
  if (/traceback|exception|stack|at\s+\S+\s+\(/i.test(text)) return false;
  return true;
}

function migrationFrom(detail: unknown): "v1" | "password" | undefined {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return undefined;
  const value = (detail as { migration?: unknown }).migration;
  if (value === "v1" || value === "password") return value;
  if (value === true) return "password";
  return undefined;
}

export async function apiErrorMessage(response: Response): Promise<{ message: string; migration?: "v1" | "password" }> {
  const fallback = response.statusText || "Request failed";
  const text = await response.text();
  if (!text) return { message: fallback };
  try {
    const body = JSON.parse(text) as { detail?: unknown; message?: unknown };
    const migration = migrationFrom(body.detail);
    if (typeof body.detail === "string" && isSafeErrorText(body.detail)) {
      return { message: body.detail.trim(), migration };
    }
    if (body.detail && typeof body.detail === "object" && !Array.isArray(body.detail)) {
      const message = (body.detail as { message?: unknown }).message;
      if (typeof message === "string" && isSafeErrorText(message)) {
        return { message: message.trim(), migration };
      }
    }
    if (Array.isArray(body.detail)) {
      const first = body.detail[0] as { msg?: unknown } | undefined;
      if (typeof first?.msg === "string" && isSafeErrorText(first.msg)) {
        return { message: first.msg.trim(), migration };
      }
    }
    if (typeof body.message === "string" && isSafeErrorText(body.message)) {
      return { message: body.message.trim(), migration };
    }
    if (migration) return { message: fallback, migration };
  } catch {
    if (isSafeErrorText(text)) return { message: text.trim() };
  }
  return { message: fallback };
}

export async function request<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = useAuthStore.getState().token;
  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401 && auth && path !== "/auth/login" && path !== "/auth/me") {
    useAuthStore.getState().clear();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload on an expired session drops every cached query of the old account
      window.location.assign("/login");
    }
  }

  if (!response.ok) {
    const parsed = await apiErrorMessage(response);
    throw new ApiError(response.status, parsed.message, parsed.migration);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function get<T>(path: string) {
  return request<T>(path);
}

export function post<T>(path: string, body?: unknown, auth = true) {
  return request<T>(
    path,
    {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    auth
  );
}

export function patch<T>(path: string, body: unknown) {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function del(path: string) {
  return request<void>(path, { method: "DELETE" });
}
