import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Prevent preview builds from failing on lint warnings
    ignoreDuringBuilds: process.env.VERCEL_ENV === "preview",
  },
  experimental: {
    // Enable Edge Runtime for API routes when needed
  },
};

export default nextConfig;
