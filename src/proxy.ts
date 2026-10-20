import { createHash, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

const ORIGIN_HEADER = "x-saturn-origin-auth";

function originAllowed(request: NextRequest): boolean {
  if (request.nextUrl.pathname === "/healthz") return true;
  const expected = process.env.ORIGIN_AUTH_SECRET || "";
  if (!expected) return !process.env.K_SERVICE;
  const name = (process.env.ORIGIN_AUTH_HEADER || ORIGIN_HEADER).toLowerCase();
  const presented = createHash("sha256").update(request.headers.get(name) || "").digest();
  // During a rotation the previous secret is still accepted, matching the API.
  const accepted = [expected, process.env.ORIGIN_AUTH_SECRET_PREVIOUS || ""].filter(Boolean);
  return accepted
    .map((value) => timingSafeEqual(presented, createHash("sha256").update(value).digest()))
    .some(Boolean);
}

function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  const connect = [
    "'self'",
    "https://api.saturn-core.com",
    "wss://api.saturn-core.com",
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
  if (!originAllowed(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
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
