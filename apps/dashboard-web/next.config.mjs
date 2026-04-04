/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@social-bot/domain', '@social-bot/config'],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
