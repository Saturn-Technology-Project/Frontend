import type { NextConfig } from "next";

// Read once, when this file loads during `next build`: the rewrite below is compiled into the
// build output. Setting API_URL on the running container changes nothing.
const apiUrl = (
  process.env.API_URL ?? "https://api.saturn-core.com"
).replace(
  /\/$/,
  ""
);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
  },
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  // No "X-Powered-By: Next.js" on every response.
  poweredByHeader: false,
  experimental: {
    // Policy generation waits on the model. The default 30s proxy limit returns 500.
    // Cloud Run ends every request at its --timeout (300 s in deploy-cloud-run.yml), so this
    // stays just under it: the browser then gets an answer instead of a cut connection.
    // Change the two together.
    proxyTimeout: 290_000,
  },
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
  // The console uses no next/image. Without this the /_next/image optimizer is a CPU-heavy,
  // unauthenticated endpoint on the public service.
  images: { unoptimized: true },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // A cross-origin page that opens the console gets no handle to it, while the console
        // keeps the handle to the sign-in popups it opens itself (src/lib/mcp-authorize.ts).
        // /connect-passkey is left out: an agent's sign-in passes through it inside a window
        // the agent's client may have opened, and this header would cut that client off.
        source: "/((?!connect-passkey).*)",
        headers: [{ key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/saturn-api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/runs", destination: "/activity", permanent: false },
      { source: "/agents/:id/runs/:runId", destination: "/activity?event=:runId", permanent: false },
    ];
  },
};

export default nextConfig;
