import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/studio",
        destination: "/app",
        permanent: false,
      },
      {
        source: "/studio/:path*",
        destination: "/app/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
