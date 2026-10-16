import { NextRequest, NextResponse } from "next/server";

const AI_ORIGIN =
  process.env.NEXT_PUBLIC_SATURN_AI_URL?.replace(/\/$/, "") ||
  "https://saturn-ai-629072855899.asia-east1.run.app";

function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  const connect = [
    "'self'",
    "https://api.saturn-core.com",
    "wss://api.saturn-core.com",
    AI_ORIGIN,
    dev ? "http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src " + connect,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    dev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|saturn-api|favicon.ico|logo.png).*)"],
};
