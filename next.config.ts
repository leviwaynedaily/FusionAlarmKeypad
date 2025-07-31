import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable telemetry
  telemetry: false,
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // 🔒 SECURITY: Enhanced security headers with CSP
  async headers() {
    const securityHeaders = [
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
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https://app.getfusion.io https://api.openweathermap.org https://www.google-analytics.com",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "base-uri 'self'",
          "object-src 'none'"
        ].join('; '),
      },
    ];

    // Add HSTS for production
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: securityHeaders,
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
  // webpack: (config, { dev, isServer }) => {
  //   // Only start background SSE service on server-side in development or production
  //   if (isServer) {
  //     // Import and start background SSE service
  //     try {
  //       import('./src/lib/background-sse').then(({ startBackgroundSSE }) => {
  //         startBackgroundSSE().catch(console.error);
  //       }).catch(err => {
  //         console.error('Background SSE service failed to start:', err);
  //       });
  //     } catch (error) {
  //       console.error('Failed to import background SSE service:', error);
  //     }
  //   }
  //   return config;
  // },

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
