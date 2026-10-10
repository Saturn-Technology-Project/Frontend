function toWsOrigin(url: string): string {
  let origin = url.trim().replace(/\/$/, "");
  if (origin.endsWith("/saturn-api")) {
    origin = origin.slice(0, -"/saturn-api".length);
  }
  if (origin.startsWith("https://")) return `wss://${origin.slice("https://".length)}`;
  if (origin.startsWith("http://")) return `ws://${origin.slice("http://".length)}`;
  return origin;
}

export function apiOrigin(): string {
  const origin = wsOrigin();
  if (origin.startsWith("wss://")) return `https://${origin.slice("wss://".length)}`;
  if (origin.startsWith("ws://")) return `http://${origin.slice("ws://".length)}`;
  return origin;
}

export function wsOrigin(): string {
  if (typeof window === "undefined") return "";
  const explicit =
    process.env.NEXT_PUBLIC_WS_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (explicit) return toWsOrigin(explicit);
  return toWsOrigin("https://api.saturn-core.com");
}
