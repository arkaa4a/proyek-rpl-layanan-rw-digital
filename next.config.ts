import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        'localhost',
        '127.0.0.1',
      ],
    },
  },
};

export default nextConfig;
