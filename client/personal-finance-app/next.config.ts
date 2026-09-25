import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["192.168.1.7"],

  experimental: {
    turbopackFileSystemCacheForBuild: false,
  },

  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === "true",
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
