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
  if (pathname === "/healthz") return true;
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
  "tool-sets",
  "tools",
]);
// HTML pages under an allowed prefix that must still not render on the console origin.
const API_BLOCKED = ["/mcp-servers/oauth/callback"];

export function isApiPath(pathname: string): boolean {
  return pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`);
}

export function apiPathAllowed(pathname: string): boolean {
  if (!isApiPath(pathname)) return false;
  const rest = pathname.slice(API_PREFIX.length);
  // Encoded separators and dot segments could reach a different route upstream.
  if (/%2f|%5c|%2e|\\/i.test(rest)) return false;
  const segments = rest.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) return false;
  if (!API_PREFIXES.has(segments[0])) return false;
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
