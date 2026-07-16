import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/i-star-opticals-crm",
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  turbopack: {
    resolveAlias: {},
  },
};

export default nextConfig;