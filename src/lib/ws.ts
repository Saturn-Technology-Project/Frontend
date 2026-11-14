function toWsOrigin(url: string): string {
  let origin = url.trim().replace(/\/$/, "");
  if (origin.endsWith("/saturn-api")) {
    origin = origin.slice(0, -"/saturn-api".length);
  }
  if (origin.startsWith("https://")) return `wss://${origin.slice("https://".length)}`;
  if (origin.startsWith("http://")) return `ws://${origin.slice("http://".length)}`;
  return origin;
}

function toHttpOrigin(origin: string): string {
  if (origin.startsWith("wss://")) return `https://${origin.slice("wss://".length)}`;
  if (origin.startsWith("ws://")) return `http://${origin.slice("ws://".length)}`;
  return origin;
}

function configuredWsOrigin(): string {
  const explicit =
    process.env.NEXT_PUBLIC_WS_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (explicit) return toWsOrigin(explicit);
  return toWsOrigin("https://api.saturn-core.com");
}

/**
 * The API's public origin as configured at build time. Unlike apiOrigin() it also answers on
 * the server, where src/proxy.ts needs it for the Content-Security-Policy.
 */
export function configuredApiOrigin(): string {
  return toHttpOrigin(configuredWsOrigin());
}

export function apiOrigin(): string {
  return toHttpOrigin(wsOrigin());
}

export function wsOrigin(): string {
  if (typeof window === "undefined") return "";
  return configuredWsOrigin();
}
