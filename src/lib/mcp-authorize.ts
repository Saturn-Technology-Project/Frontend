import { startMcpOauth } from "@/lib/api";
import { apiOrigin } from "@/lib/ws";

export class McpAuthorizeError extends Error {
  constructor(
    message: string,
    readonly code: "popup" | "denied"
  ) {
    super(message);
    this.name = "McpAuthorizeError";
  }
}

export function mcpOauthErrorText(
  error: unknown,
  labels: { popup: string; signInUnavailable: string }
): string {
  if (error instanceof McpAuthorizeError && error.code === "popup") return labels.popup;
  if (error instanceof Error && error.message.includes("does not let Saturn start sign-in")) return labels.signInUnavailable;
  return error instanceof Error ? error.message : labels.popup;
}

export async function authorizeMcp(body: { name: string; endpoint: string }): Promise<"connected" | "approved" | "cancelled"> {
  const nonce = crypto.randomUUID();
  const started = await startMcpOauth({ ...body, nonce });
  if (!started.authorization_url) return "connected";
  let authorizationUrl: URL;
  try {
    authorizationUrl = new URL(started.authorization_url);
  } catch {
    throw new McpAuthorizeError("The MCP provider did not grant access.", "denied");
  }
  // The API checks this URL, but a popup is never opened on anything but https.
  if (authorizationUrl.protocol !== "https:") {
    throw new McpAuthorizeError("The MCP provider did not grant access.", "denied");
  }
  return await new Promise((resolve, reject) => {
    let popup: Window | null = null;
    const timer = window.setInterval(() => {
      if (popup && popup.closed) {
        cleanup();
        resolve("cancelled");
      }
    }, 400);

    function cleanup() {
      window.clearInterval(timer);
      window.removeEventListener("message", onMessage);
    }

    function onMessage(event: MessageEvent) {
      if (!popup || event.source !== popup) return;
      // Only the API's own callback page may report the result; the provider's pages may not.
      if (event.origin !== apiOrigin() && process.env.NODE_ENV !== "development") return;
      const data = event.data as { type?: string; ok?: boolean; nonce?: string; error?: string } | null;
      if (!data || data.type !== "saturn-mcp-oauth" || data.nonce !== nonce) return;
      cleanup();
      if (data.ok) resolve("approved");
      else reject(new McpAuthorizeError(data.error || "The MCP provider did not grant access.", "denied"));
    }

    window.addEventListener("message", onMessage);
    popup = window.open(authorizationUrl.href, "saturn-mcp-oauth", "popup,width=520,height=720");
    if (!popup) {
      cleanup();
      reject(new McpAuthorizeError("popup", "popup"));
    }
  });
}
