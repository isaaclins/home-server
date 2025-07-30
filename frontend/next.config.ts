import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    // Use environment variable for backend URL, fallback to Docker service name
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8080';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`
      },
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*`
      },
      {
        source: '/actuator/:path*',
        destination: `${backendUrl}/actuator/:path*`
      }
    ];
  }
};

export default nextConfig;
