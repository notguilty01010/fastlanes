import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained сборка для прод-деплоя: .next/standalone/server.js
  // плюс минимальный node_modules (только то, что реально используется).
  output: "standalone",
  // Prisma грузит query-engine динамически, и трейсер Next его пропускает —
  // явно подсасываем .prisma/client в standalone-бандл.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;
