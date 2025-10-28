import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enable Edge Runtime for API routes when needed
  },
};

export default nextConfig;
