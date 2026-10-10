import type { NextConfig } from "next";

const apiUrl = (
  process.env.API_URL ?? "https://saturn-backend-629072855899.asia-east1.run.app"
).replace(
  /\/$/,
  ""
);

const nextConfig: NextConfig = {
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
