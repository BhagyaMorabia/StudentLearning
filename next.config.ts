import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ── Security Headers ───────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer info
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Strict Transport Security (1 year)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Permissions policy
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js requires unsafe-eval in dev; tighten in prod
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https:",
              "font-src 'self' https://fonts.gstatic.com",
              // Clerk, Anthropic, Neon, Upstash
              "connect-src 'self' https://api.anthropic.com https://*.neon.tech https://*.upstash.io https://clerk.*.lcl.dev https://*.clerk.accounts.dev wss://clerk.*.lcl.dev",
              "frame-src https://clerk.*.lcl.dev https://*.clerk.accounts.dev",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // ── Server External Packages ───────────────────────────────────────────────
  // These packages use Node.js-specific APIs and must not be bundled for client
  // NOTE: In Next.js 16, this moved from experimental.serverComponentsExternalPackages
  // to the stable top-level serverExternalPackages.
  serverExternalPackages: [
    '@neondatabase/serverless',
    'drizzle-orm',
    '@xenova/transformers',
  ],

  // ── Images ────────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },

  // ── React Strict Mode ─────────────────────────────────────────────────────
  reactStrictMode: true,
};

export default nextConfig;
