import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // Bundle analyzer for optimization
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-tabs'],
    turbo: {
      resolveExtensions: [
        '.mdx',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
        '.json',
      ],
    },
  },
  webpack: (config, { dev, isServer }) => {
    // Only start background SSE service on server-side in development or production
    if (isServer) {
      // Import and start background SSE service
      import('./src/lib/background-sse').then(({ startBackgroundSSE }) => {
        startBackgroundSSE().catch(console.error);
      });
    }
    return config;
  },

  // Allow dev server access from local network IPs
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: [
      '192.168.200.168', // Your specific local network IP
      '192.168.1.*',     // Common local network range
      '10.0.0.*',        // Another common local network range  
    ],
  }),

  // Service Worker for offline capability
  // (Already configured in layout.tsx)
};

export default nextConfig;
