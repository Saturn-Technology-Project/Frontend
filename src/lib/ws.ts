function toWsOrigin(url: string): string {
  let origin = url.trim().replace(/\/$/, "");
  if (origin.endsWith("/saturn-api")) {
    origin = origin.slice(0, -"/saturn-api".length);
  }
  if (origin.startsWith("https://")) return `wss://${origin.slice("https://".length)}`;
  if (origin.startsWith("http://")) return `ws://${origin.slice("http://".length)}`;
  return origin;
}

export function wsOrigin(): string {
  if (typeof window === "undefined") return "";
  const explicit =
    process.env.NEXT_PUBLIC_WS_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (explicit) return toWsOrigin(explicit);
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    const port = process.env.NEXT_PUBLIC_API_PORT || "8000";
    return `${proto}//${host}:${port}`;
  }
  return `${proto}//${window.location.host}`;
}

export function panelSocketUrl(token: string): string {
  return `${wsOrigin()}/ws/panel?token=${encodeURIComponent(token)}`;
}

export function agentSocketBaseUrl(): string {
  return `${wsOrigin()}/ws/agents`;
}

export function connectorSocketBaseUrl(): string {
  return `${wsOrigin()}/ws/connectors`;
}

export function absoluteWsUrl(path: string): string {
  if (path.startsWith("ws://") || path.startsWith("wss://")) return path;
  const origin = wsOrigin();
  if (!origin) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function runtimeEnv(agentId: string, token: string): string {
  return [
    `SATURN_CLOUD_WS=${agentSocketBaseUrl()}`,
    `SATURN_AGENT_ID=${agentId}`,
    `SATURN_AGENT_TOKEN=${token}`,
  ].join("\n");
}

export function connectorEnv(connectorId: string, token: string): string {
  return [
    `SATURN_CLOUD_WS=${connectorSocketBaseUrl()}`,
    `CONNECTOR_ID=${connectorId}`,
    `CONNECTOR_TOKEN=${token}`,
  ].join("\n");
}

export function connectorEnrollCommand(connectorId: string, token: string): string {
  const ws = connectorSocketBaseUrl();
  return [
    'curl -s -X PUT "$CONNECTOR_URL/enrollment" \\',
    '  -H "Content-Type: application/json" \\',
    `  -d '{"token":"${token}","cloudWs":"${ws}","connector_id":"${connectorId}"}'`,
  ].join("\n");
}
