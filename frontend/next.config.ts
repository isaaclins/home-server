import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:8080/api/:path*'
      },
      {
        source: '/ws/:path*',
        destination: 'http://backend:8080/ws/:path*'
      },
      {
        source: '/actuator/:path*',
        destination: 'http://backend:8080/actuator/:path*'
      }
    ];
  }
};

export default nextConfig;
