import { NextRequest, NextResponse } from "next/server";

import {
  CONSOLE_AUTH_HEADER,
  CONSOLE_CLIENT_IP_HEADER,
  apiPathAllowed,
  consoleForwardHeaders,
  cspOrigin,
  isApiPath,
  originAllowed,
} from "@/lib/edge";
import { configuredApiOrigin } from "@/lib/ws";

function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  // The same build-time value the pages use, so the policy follows NEXT_PUBLIC_WS_URL.
  const api = cspOrigin(configuredApiOrigin());
  const connect = [
    "'self'",
    api,
    dev ? "http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*" : "",
  ]
    .filter(Boolean)
    .join(" ");
  // The agent sign-in page lives on the API. /connect-passkey posts the passkey answer to it.
  const formAction = ["'self'", api, dev ? "http://localhost:* http://127.0.0.1:*" : ""]
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
    "form-action " + formAction,
    "frame-ancestors 'none'",
    "frame-src 'none'",
    dev ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}

function forwardToApi(request: NextRequest) {
  if (!apiPathAllowed(request.nextUrl.pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const header = (name: string) => request.headers.get(name);
  const requestHeaders = new Headers(request.headers);
  // Only this proxy may say who the browser is; drop anything the client sent.
  requestHeaders.delete(CONSOLE_AUTH_HEADER);
  requestHeaders.delete(CONSOLE_CLIENT_IP_HEADER);
  for (const [name, value] of Object.entries(consoleForwardHeaders(header, process.env))) {
    requestHeaders.set(name, value);
  }
  // No response headers are set here. A header set on this response is not added to what the
  // rewrite proxies back; it was sent to the API as a request header instead. The API puts its
  // own headers on every response (nosniff, frame denial, and a CSP of default-src 'none').
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export function proxy(request: NextRequest) {
  if (!originAllowed(request.nextUrl.pathname, (name) => request.headers.get(name), process.env)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (isApiPath(request.nextUrl.pathname)) {
    return forwardToApi(request);
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
  // /saturn-api and /_next/image are no longer exempt: the origin gate covers every dynamic route.
  matcher: ["/((?!_next/static|favicon.ico|logo.png).*)"],
};
