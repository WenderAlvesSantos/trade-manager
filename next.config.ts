import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components desligado: o CSS-in-JS do antd usa Math.random() na renderização, o que ele proíbe.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
