import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*", // Django backend
      },
    ];
  },
  // Next.js 16 使用 Turbopack，不需要額外配置 react-pdf
  // react-pdf 會自動處理 worker
};

export default nextConfig;
