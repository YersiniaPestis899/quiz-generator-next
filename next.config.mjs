/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // APIルート処理の最大サイズを増やす（Claudeレスポンス用）
  experimental: {
    serverComponentsExternalPackages: ['@aws-sdk/client-bedrock-runtime'],
  },
  // Serverless Functionsの実行時間を拡張
  serverRuntimeConfig: {
    maxDuration: 60, // 60秒
  },
};

export default nextConfig;