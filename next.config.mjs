import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // @huggingface/transformers pulls in onnxruntime-node (354MB) on the server side.
  // Keep it entirely server-external so it is never bundled into Vercel serverless functions.
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node', 'onnxruntime-web'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Belt-and-suspenders: also mark as externals so webpack skips them entirely
      const existing = Array.isArray(config.externals) ? config.externals : (config.externals ? [config.externals] : []);
      config.externals = [
        ...existing,
        '@huggingface/transformers',
        'onnxruntime-node',
        'onnxruntime-web',
      ];
    }
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  hideSourceMaps: true,
});
