import CopyWebpackPlugin from "copy-webpack-plugin";
import type { NextConfig } from "next";

const useManagedLocalBuildMode =
  process.env.TOXINMAP_LOCAL_BUILD_PROFILE === "managed";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CESIUM_BASE_URL:
      process.env.NEXT_PUBLIC_CESIUM_BASE_URL ?? "/cesium",
  },
  typescript: {
    ignoreBuildErrors: process.env.TOXINMAP_SKIP_NEXT_BUILD_TYPECHECK === "true",
  },
  experimental: useManagedLocalBuildMode
    ? {
        cpus: 1,
        workerThreads: true,
        staticGenerationMaxConcurrency: 1,
        staticGenerationMinPagesPerWorker: 10_000,
        webpackBuildWorker: false,
      }
    : undefined,
  webpack: (config) => {
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "node_modules/cesium/Build/Cesium",
            to: "../public/cesium",
          },
        ],
      }),
    );

    return config;
  },
};

export default nextConfig;
