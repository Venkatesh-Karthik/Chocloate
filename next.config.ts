import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Optional: Disable image optimization if you ever use next/image
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
