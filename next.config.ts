import CopyWebpackPlugin from "copy-webpack-plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CESIUM_BASE_URL:
      process.env.NEXT_PUBLIC_CESIUM_BASE_URL ?? "/cesium",
  },
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
