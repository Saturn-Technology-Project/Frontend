import assert from "node:assert/strict";
import test from "node:test";
import { apiPathAllowed, consoleForwardHeaders, cspOrigin, inboundClientIp, isApiPath, originAllowed } from "../src/lib/edge.ts";
import { configuredApiOrigin } from "../src/lib/ws.ts";

const headers = (values) => (name) => values[name.toLowerCase()] ?? null;

test("origin gate covers the API proxy and fails closed on Cloud Run", () => {
  const env = { ORIGIN_AUTH_SECRET: "edge-secret" };
  assert.equal(originAllowed("/saturn-api/auth/login", headers({}), env), false);
  assert.equal(originAllowed("/saturn-api/auth/login", headers({ "x-saturn-origin-auth": "wrong" }), env), false);
  assert.equal(originAllowed("/saturn-api/auth/login", headers({ "x-saturn-origin-auth": "edge-secret" }), env), true);
  assert.equal(originAllowed("/_next/image", headers({}), env), false);
  assert.equal(originAllowed("/health", headers({}), env), true);
  assert.equal(originAllowed("/healthz", headers({}), env), true);
  assert.equal(originAllowed("/health/", headers({}), env), false);
  assert.equal(originAllowed("/healthz/", headers({}), env), false);
  // Only the console's own probe is open. The API's routes behind the proxy are not.
  assert.equal(originAllowed("/saturn-api/health", headers({}), env), false);
  assert.equal(originAllowed("/saturn-api/status", headers({}), env), false);
  assert.equal(originAllowed("/overview", headers({}), { K_SERVICE: "saturn-frontend" }), false);
  assert.equal(originAllowed("/overview", headers({}), {}), true);
  const rotating = { ORIGIN_AUTH_SECRET: "new", ORIGIN_AUTH_SECRET_PREVIOUS: "old" };
  assert.equal(originAllowed("/overview", headers({ "x-saturn-origin-auth": "old" }), rotating), true);
});

test("API proxy serves only the console's JSON routes", () => {
  for (const path of [
    "/saturn-api/auth/login",
    "/saturn-api/org/payload-keys/member",
    "/saturn-api/mcp-servers/oauth/start",
    "/saturn-api/health",
    "/saturn-api/status",
    "/saturn-api/activity/run_1/reveal",
  ]) {
    assert.equal(apiPathAllowed(path), true, path);
  }
  for (const path of [
    "/saturn-api",
    "/saturn-api/",
    "/saturn-api/oauth/authorize",
    "/saturn-api/mcp",
    "/saturn-api/admin/orgs",
    "/saturn-api/docs",
    "/saturn-api/mcp-servers/oauth/callback",
    "/saturn-api/mcp-servers//oauth/callback",
    "/saturn-api/auth/../oauth/authorize",
    "/saturn-api/auth/%2e%2e/oauth/authorize",
    "/saturn-api/auth%2F..%2Foauth/authorize",
    "/saturn-api/org\\..\\admin",
    "/saturn-apiX/auth/login",
  ]) {
    assert.equal(apiPathAllowed(path), false, path);
  }
});

test("every spelling the rewrite would match is treated as an API request, and only the exact one is served", () => {
  // The rewrite matches without regard to case. A path that skipped the allow-list this way was
  // proxied to routes the console must not expose, with client-sent console headers left in place.
  for (const path of [
    "/Saturn-Api/admin/orgs",
    "/SATURN-API/oauth/authorize",
    "/saturn-API/mcp",
    "/Saturn-Api/auth/login",
    "/%73aturn-api/admin/orgs",
    "/saturn%2Dapi/admin/orgs",
    "/Saturn-Api",
  ]) {
    assert.equal(isApiPath(path), true, path);
    assert.equal(apiPathAllowed(path), false, path);
  }
  assert.equal(isApiPath("/saturn-api/auth/login"), true);
  assert.equal(isApiPath("/saturn-apiX/auth/login"), false);
  assert.equal(isApiPath("/overview"), false);
  assert.equal(isApiPath("/saturn-api%zz/x"), false);
});

test("a blocked route cannot be reached by escaping part of its name", () => {
  for (const path of [
    "/saturn-api/mcp-servers/oauth/callbac%6b",
    "/saturn-api/mcp-servers/oauth/%63allback",
    "/saturn-api/mcp-servers/%6fauth/callback/x",
    "/saturn-api/%6dcp-servers/oauth/callback",
    "/saturn-api/%61dmin/orgs",
    "/saturn-api/%6dcp",
    "/saturn-api/auth/%zz",
    "/saturn-api/auth/a%0ab",
    "/saturn-api/auth/%252e%252e/x%2f",
  ]) {
    assert.equal(apiPathAllowed(path), false, path);
  }
  // An escape in an id is still fine: it decodes to the same route the API will match.
  assert.equal(apiPathAllowed("/saturn-api/org/credentials/my%20key"), true);
  assert.equal(apiPathAllowed("/saturn-api/%61uth/login"), true);
});

test("console tells the API the browser's address only behind Cloudflare and with the console secret", () => {
  const inbound = headers({ "cf-connecting-ip": "203.0.113.7" });
  assert.equal(inboundClientIp(inbound, {}), "");
  assert.equal(inboundClientIp(inbound, { ORIGIN_AUTH_SECRET: "edge" }), "203.0.113.7");
  assert.equal(inboundClientIp(headers({ "cf-connecting-ip": "not-an-ip" }), { ORIGIN_AUTH_SECRET: "edge" }), "");
  assert.deepEqual(consoleForwardHeaders(inbound, { ORIGIN_AUTH_SECRET: "edge" }), {});
  assert.deepEqual(consoleForwardHeaders(inbound, { ORIGIN_AUTH_SECRET: "edge", CONSOLE_PROXY_SECRET: "console" }), {
    "x-saturn-console-auth": "console",
    "x-saturn-client-ip": "203.0.113.7",
  });
});

test("the CSP names the configured API by origin only, and nothing that is not a URL", () => {
  assert.equal(cspOrigin("https://api.saturn-core.com"), "https://api.saturn-core.com");
  assert.equal(cspOrigin("http://localhost:8000/saturn-api/"), "http://localhost:8000");
  // A value that could add a directive of its own to the header is dropped whole.
  assert.equal(cspOrigin("https://api.example.com; script-src *"), "");
  assert.equal(cspOrigin("javascript:alert(1)"), "");
  assert.equal(cspOrigin("wss://api.example.com"), "");
  assert.equal(cspOrigin(""), "");
});

test("the API origin comes from the build-time setting, on the server too", () => {
  const saved = { ws: process.env.NEXT_PUBLIC_WS_URL, api: process.env.NEXT_PUBLIC_API_URL };
  try {
    delete process.env.NEXT_PUBLIC_WS_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    assert.equal(configuredApiOrigin(), "https://api.saturn-core.com");
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/";
    assert.equal(configuredApiOrigin(), "http://localhost:8000");
    process.env.NEXT_PUBLIC_WS_URL = "https://api.example.com/saturn-api";
    assert.equal(configuredApiOrigin(), "https://api.example.com");
  } finally {
    for (const [name, value] of [["NEXT_PUBLIC_WS_URL", saved.ws], ["NEXT_PUBLIC_API_URL", saved.api]]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
