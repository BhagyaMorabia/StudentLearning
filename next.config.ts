import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const clerkFrontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API ?? '';
const clerkIssuer = process.env.NEXT_PUBLIC_CLERK_ISSUER ?? '';

const connectSrc = [
  "'self'",
  'https://*.neon.tech',
  'wss://*.neon.tech',
  'https://*.upstash.io',
  'https://generativelanguage.googleapis.com',
  'https://api.helicone.ai',
  'https://api.worker.helicone.ai',
];
if (clerkFrontendApi) connectSrc.push(`https://${clerkFrontendApi}`);
if (clerkIssuer) connectSrc.push(clerkIssuer);
if (isDev) connectSrc.push('https://clerk.*.lcl.dev', 'wss://clerk.*.lcl.dev', 'https://*.clerk.accounts.dev');

const frameSrc = ['https://*.clerk.accounts.dev'];
if (isDev) frameSrc.push('https://clerk.*.lcl.dev');

const scriptSrc: string[] = [
  "'self'",
  'https://cdn.jsdelivr.net',
];
if (isDev) {
  // Next.js dev server (fast-refresh, HMR) still requires unsafe-eval/inline.
  scriptSrc.push("'unsafe-eval'", "'unsafe-inline'");
} else {
  // In production we rely on the hash/nonce of Next's built-in chunks.
  scriptSrc.push("'strict-dynamic'");
}

const nextConfig: NextConfig = {
  // ── Security Headers ───────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc.join(' ')}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https:",
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src ${connectSrc.join(' ')}`,
              `frame-src ${frameSrc.join(' ')}`,
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/diagrams/:path*',
        headers: [
          // Diagram filenames are UUID-suffixed (immutable); long cache TTL.
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
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
