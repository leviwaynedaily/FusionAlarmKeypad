import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientLayout } from "@/components/ClientLayout";
import "./globals.css";
import { SSEProvider } from '@/hooks/SSEContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fusion Alarm",
  description: "Professional security alarm control panel",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fusion Alarm",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f0f0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('fusion_theme') || 'system';
                  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Fallback to dark mode if there's an error
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/*
          Safely register the service-worker: check that the file exists first so we avoid 404 noise
          in the console when running locally or on deployments without an sw.js.
        */}
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Register Service Worker with SSE bypass support
                if (!('serviceWorker' in navigator)) return;
                
                // Wait for full page load so routing isn't blocked
                window.addEventListener('load', () => {
                  // Verify that /sw.js is reachable before trying to register
                  fetch('/sw.js', { method: 'HEAD' })
                    .then((res) => {
                      if (res.ok) {
                        navigator.serviceWorker.register('/sw.js')
                          .then((registration) => {
                            // 🔥 FIX: Safe development check in browser
                            if (window.location.hostname === 'localhost') {
                              console.log('ServiceWorker registered successfully');
                            }
                          })
                          .catch((error) => {
                            // 🔥 FIX: Safe development check in browser
                            if (window.location.hostname === 'localhost') {
                              console.error('ServiceWorker registration failed:', error);
                            }
                          });
                      }
                    })
                    .catch(() => {
                      // Service worker file not found, continue without it
                    });
                });
              })();
            `,
          }}
        />
        <style>{`
          @font-face {
            font-family: 'CSG';
            src: url('/CSG-v2.otf') format('opentype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `}</style>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SSEProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </SSEProvider>
      </body>
    </html>
  );
}