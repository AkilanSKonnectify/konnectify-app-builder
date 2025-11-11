/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed "output: export" to enable API routes for CORS proxy
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
