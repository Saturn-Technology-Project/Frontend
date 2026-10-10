import type { NextConfig } from "next";

const apiUrl = (
  process.env.API_URL ?? "https://saturn-backend-629072855899.asia-east1.run.app"
).replace(
  /\/$/,
  ""
);

const nextConfig: NextConfig = {
  experimental: {
    // Policy generation waits on the model. The default 30s proxy limit returns 500.
    proxyTimeout: 600_000,
  },
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
  async rewrites() {
    return [
      {
        source: "/saturn-api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
