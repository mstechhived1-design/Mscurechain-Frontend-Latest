import type { NextConfig } from "next";
import path from "path";

/**
 * MongoDB ObjectId pattern: exactly 24 hex characters
 * Used to identify tenant-prefixed routes like /{hospitalId}/doctor
 */
const HOSPITAL_ID_PATTERN =
  ":hospitalId([a-f0-9]{24}|[a-z0-9][a-z0-9-]{2,58}[a-z0-9])";

const nextConfig: NextConfig = {
  // ✅ Production optimizations
  compress: true, // Enable gzip compression

  // ✅ Explicitly set the workspace root to this project directory
  // This prevents Next.js from inferring incorrect roots due to lockfiles in parent dirs
  outputFileTracingRoot: path.resolve(__dirname),

  // ✅ Enable React Compiler for better performance
  experimental: {
    reactCompiler: false,
    optimizePackageImports: [
      "lucide-react", "recharts", "date-fns",
      "@tanstack/react-query", "zod", "react-hook-form"
    ], // Only import what's used
    // ✅ Increase Server Actions body size limit (for profile uploads, etc.)
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },

  // ✅ Use explicit root to avoid "multiple lockfiles" warnings (Next.js 15+ top-level key)
  turbopack: {
    // ✅ Root path must be absolute to avoid warnings
    root: process.cwd(),
  },

  // ✅ Image optimization
  images: {
    formats: ["image/webp", "image/avif"], // Modern image formats
    minimumCacheTTL: 60, // Cache images for 60 seconds
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Responsive breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ✅ Better build output
  productionBrowserSourceMaps: false, // Disable source maps in production

  // ✅ Strict mode for better error detection
  reactStrictMode: true,


  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  // Proxy handled by /app/api/proxy/[...path]/route.ts (reliable with Turbopack)
};

export default nextConfig;