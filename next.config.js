/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed "output: export" to enable API routes for CORS proxy
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Mark esbuild as external so it's not bundled
  // This is required because esbuild needs to access its binary executable
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle externals - it can be an array or a function
      const originalExternals = config.externals;
      if (typeof originalExternals === "function") {
        config.externals = [
          originalExternals,
          ({ request }, callback) => {
            if (request === "esbuild") {
              return callback(null, "commonjs " + request);
            }
            callback();
          },
        ];
      } else if (Array.isArray(originalExternals)) {
        config.externals = [...originalExternals, "esbuild"];
      } else {
        config.externals = ["esbuild"];
      }
    }
    return config;
  },
  // Also mark as external for server components
  // serverComponentsExternalPackages: ["esbuild"],
};

module.exports = nextConfig;
