import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@v4/types', '@v4/utils', '@v4/validators'],
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
