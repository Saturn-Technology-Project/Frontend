import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

// Pure helpers for src/proxy.ts. Kept free of next/server so they run under node --test.

export const ORIGIN_HEADER = "x-saturn-origin-auth";
export const CONSOLE_AUTH_HEADER = "x-saturn-console-auth";
export const CONSOLE_CLIENT_IP_HEADER = "x-saturn-client-ip";
export const API_PREFIX = "/saturn-api";

type Env = Record<string, string | undefined>;
type HeaderGetter = (name: string) => string | null;

function secretMatches(presented: string, accepted: string[]): boolean {
  const digest = createHash("sha256").update(presented).digest();
  return accepted
    .filter(Boolean)
    .map((value) => timingSafeEqual(digest, createHash("sha256").update(value).digest()))
    .some(Boolean);
}

export function originAllowed(pathname: string, header: HeaderGetter, env: Env): boolean {
  // The probe: answers only {"status":"ok"}. /healthz is the older name, which Cloud Run keeps
  // for itself and never passes on, so only /health is reachable there.
  if (pathname === "/health" || pathname === "/healthz") return true;
  const expected = env.ORIGIN_AUTH_SECRET || "";
  // Local and tests leave the secret unset. Cloud Run must fail closed.
  if (!expected) return !env.K_SERVICE;
  const name = (env.ORIGIN_AUTH_HEADER || ORIGIN_HEADER).toLowerCase();
  // During a rotation the previous secret is still accepted, matching the API.
  return secretMatches(header(name) || "", [expected, env.ORIGIN_AUTH_SECRET_PREVIOUS || ""]);
}

// The API route prefixes the console calls through /saturn-api. Anything else on the API
// (OAuth consent pages, the MCP endpoint, platform admin) is not served on the console origin.
const API_PREFIXES = new Set([
  "activity",
  "agents",
  "approvals",
  "auth",
  "health",
  "mcp-servers",
  "org",
  "policies",
  "status",
  "tool-sets",
  "tools",
]);
// HTML pages under an allowed prefix that must still not render on the console origin.
const API_BLOCKED = ["/mcp-servers/oauth/callback"];

/** The path as the rewrite and the API will read it: escapes decoded, case ignored. */
function folded(pathname: string): string {
  try {
    return decodeURIComponent(pathname).toLowerCase();
  } catch {
    return pathname.toLowerCase();
  }
}

/**
 * Whether a request is headed for the API proxy, however its path is spelled.
 *
 * The rewrite in next.config.ts matches /saturn-api without regard to case, so a check for the
 * exact spelling would let "/Saturn-Api/admin/orgs" skip the allow-list below, and with it the
 * removal of client-sent console headers, and still be proxied. Anything that could match the
 * rewrite is treated as an API request here; apiPathAllowed then accepts only the exact prefix.
 */
export function isApiPath(pathname: string): boolean {
  const path = folded(pathname);
  return path === API_PREFIX || path.startsWith(`${API_PREFIX}/`);
}

export function apiPathAllowed(pathname: string): boolean {
  // The exact prefix only. Other spellings reach the rewrite too, but the console never uses them.
  if (!pathname.startsWith(`${API_PREFIX}/`)) return false;
  const rest = pathname.slice(API_PREFIX.length);
  // Encoded separators and dot segments could reach a different route upstream.
  if (/%2f|%5c|%2e|\\/i.test(rest)) return false;
  // The API decodes each segment before it routes, so the check has to read what the API will
  // read: "callbac%6b" is "callback" by the time it is matched there.
  const segments: string[] = [];
  for (const raw of rest.split("/").filter(Boolean)) {
    let segment: string;
    try {
      segment = decodeURIComponent(raw);
    } catch {
      return false;
    }
    // A separator, a dot segment or a control character that only appears once decoded.
    if (segment === "." || segment === ".." || /[\/\\\u0000-\u001f\u007f]/.test(segment)) return false;
    segments.push(segment);
  }
  if (!segments.length || !API_PREFIXES.has(segments[0])) return false;
  const normalized = `/${segments.join("/")}`;
  return !API_BLOCKED.some((blocked) => normalized === blocked || normalized.startsWith(`${blocked}/`));
}

/**
 * The browser's address, as the edge reported it. Cloudflare overwrites CF-Connecting-IP, so it
 * is trusted only once origin auth has proved the request came through Cloudflare.
 */
export function inboundClientIp(header: HeaderGetter, env: Env): string {
  if (!(env.ORIGIN_AUTH_SECRET || "").trim()) return "";
  const value = (header("cf-connecting-ip") || "").trim();
  return isIP(value) ? value : "";
}

/**
 * Headers that tell the API who the browser is. Every console request reaches the API from this
 * service's address, so without them the API's per-address limits are shared by every user.
 * The API trusts the address only when the console secret matches.
 */
export function consoleForwardHeaders(header: HeaderGetter, env: Env): Record<string, string> {
  const secret = (env.CONSOLE_PROXY_SECRET || "").trim();
  const ip = inboundClientIp(header, env);
  if (!secret || !ip) return {};
  return { [CONSOLE_AUTH_HEADER]: secret, [CONSOLE_CLIENT_IP_HEADER]: ip };
}

/**
 * A configured URL as a CSP source: its origin only, or nothing when it is not an http(s) URL.
 * The value comes from an environment variable and goes into a response header, so it is never
 * copied in as written.
 */
export function cspOrigin(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.origin : "";
  } catch {
    return "";
  }
}
