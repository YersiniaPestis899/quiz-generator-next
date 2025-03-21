/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 統合された実験的機能設定
  experimental: {
    serverComponentsExternalPackages: ['@aws-sdk/client-bedrock-runtime'],
    serverActions: {
      bodySizeLimit: '4mb',
      timeout: 60, // 60秒
    },
  },
};

export default nextConfig;