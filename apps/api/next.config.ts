import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nms/shared', '@nms/db'],
};

export default nextConfig;
