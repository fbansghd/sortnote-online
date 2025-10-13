/**
 * next.config.js — Set Turbopack root to silence workspace root inference warning
 * Uses the stable `turbopack` option available in Next.js 15+
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // このプロジェクト配下をルートに固定
    root: __dirname,
  },
};

module.exports = nextConfig;
