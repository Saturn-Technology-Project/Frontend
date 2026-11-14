import { fetchMcpServers, startMcpOauth, type ApiMcpServer } from "@/lib/api";

export class McpAuthorizeError extends Error {
  code: "popup" | "denied" | "incomplete";

  constructor(message: string, code: "popup" | "denied" | "incomplete") {
    super(message);
    this.name = "McpAuthorizeError";
    this.code = code;
  }
}

export function mcpOauthErrorText(
  error: unknown,
  labels: { popup: string; signInUnavailable: string; incomplete: string }
): string {
  if (error instanceof McpAuthorizeError && error.code === "popup") return labels.popup;
  if (error instanceof McpAuthorizeError && error.code === "incomplete") return labels.incomplete;
  if (error instanceof Error && error.message.includes("does not let Saturn start sign-in")) return labels.signInUnavailable;
  return error instanceof Error ? error.message : labels.popup;
}

function withoutTrailingSlash(url: string) {
  return url.trim().replace(/\/+$/, "");
}

/** Whether the API now holds a working authorization for this server. The API keys servers by name. */
export function mcpSignInCompleted(
  servers: Pick<ApiMcpServer, "name" | "endpoint" | "has_authorization" | "secret_status">[],
  wanted: { name: string; endpoint: string }
): boolean {
  return servers.some(
    (server) =>
      (server.name.trim() === wanted.name.trim() ||
        withoutTrailingSlash(server.endpoint) === withoutTrailingSlash(wanted.endpoint)) &&
      server.has_authorization === true &&
      server.secret_status !== "needs_reconnect"
  );
}

/**
 * Opens the provider's sign-in in a window that has no link back to this page.
 *
 * With that link, any page shown in the window could send this tab to another address while
 * the user is looking at the sign-in. "noopener" removes the link, but then window.open returns
 * nothing and this page cannot tell when the window closes. So the window starts empty, its
 * link is cut here, and only then is it sent to the provider.
 */
function openDetached(url: string): Window | null {
  const popup = window.open("about:blank", "_blank", "popup,width=520,height=720");
  if (!popup) return null;
  popup.opener = null;
  popup.location.href = url;
  return popup;
}

function closed(popup: Window): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      if (!popup.closed) return;
      window.clearInterval(timer);
      resolve();
    }, 400);
  });
}

// The API saves the connection just before its callback page closes the window, so the first
// read can arrive too early.
const CONFIRM_DELAYS_MS = [0, 800, 1600];

export async function authorizeMcp(body: { name: string; endpoint: string }): Promise<"connected" | "approved"> {
  // The API binds the sign-in to this value. Its callback page cannot post it back any more.
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
  const popup = openDetached(authorizationUrl.href);
  if (!popup) throw new McpAuthorizeError("popup", "popup");
  await closed(popup);
  // The window could not report back, so the API is asked whether the sign-in went through.
  for (const delay of CONFIRM_DELAYS_MS) {
    if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
    const servers = await fetchMcpServers().catch(() => null);
    if (servers && mcpSignInCompleted(servers, body)) return "approved";
  }
  throw new McpAuthorizeError("incomplete", "incomplete");
}
