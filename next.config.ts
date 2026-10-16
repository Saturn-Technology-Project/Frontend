import type { NextConfig } from "next";

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
  experimental: {
    // Policy generation waits on the model. The default 30s proxy limit returns 500.
    proxyTimeout: 600_000,
  },
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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
