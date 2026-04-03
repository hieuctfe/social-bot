/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@social-bot/domain', '@social-bot/config'],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
