import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type checking during build (faster builds, caught during dev)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
