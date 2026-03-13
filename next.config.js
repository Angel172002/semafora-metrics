/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
  // Block MIME-type sniffing
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  // Enable XSS filter in browsers
  { key: 'X-XSS-Protection',         value: '1; mode=block' },
  // Control referrer information
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  // Disallow access to sensitive browser APIs from iframes
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  // HSTS — force HTTPS for 1 year (only applies in production via Vercel)
  {
    key:   'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // Content Security Policy
  {
    key:   'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Allow inline scripts (Next.js requires this) and eval (Recharts/dev)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Allow inline styles (Tailwind CSS)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Google Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Allow same-origin images + data URIs (charts)
      "img-src 'self' data: blob:",
      // API connections: NocoDB, Meta, Google, TikTok, WhatsApp
      [
        "connect-src 'self'",
        'https://graph.facebook.com',
        'https://googleads.googleapis.com',
        'https://business-api.tiktok.com',
        'https://accounts.google.com',
      ].join(' '),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
