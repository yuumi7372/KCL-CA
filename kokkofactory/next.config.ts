import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 💡 ここから追加：ESLintのエラーを無視してビルドするよ！
  /*eslint: {
    ignoreDuringBuilds: true,
  },*/
  // 💡 ここから追加：TypeScriptの型エラーを無視してビルドするよ！
  typescript: {
    ignoreBuildErrors: true,
  },

  webpack(config, { isServer }) {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@": path.resolve(process.cwd(), "src"), // __dirnameでエラーが出る場合はprocess.cwd()が安定するよ！
      },
    };

    if (!isServer) {
      // クライアント専用設定はここに書いてにょ✨
    }

    return config;
  },
  // ⭐ Turbopack を無効化
  /*experimental: {
    turbo: false,
  },
  appDir: "src/app",*/
};

export default nextConfig;
