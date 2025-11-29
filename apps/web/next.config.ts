import type { NextConfig } from 'next';
import { join } from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: join(__dirname, '../../'),
  transpilePackages: ['@v4-connect/types', '@v4-connect/utils', '@v4-connect/validators'],
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
