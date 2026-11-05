/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 🛡️ SECURITY: Disable Debug Source Maps in Production & Hide Next.js Fingerprint
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  // 🛡️ SECURITY: Enterprise HTTP Security Headers (Blocks XSS, Clickjacking, MIME Sniffing)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },

  // 🟢 EXISTING REWRITES INTACT
  async rewrites() {
    return [
      {
        // Fix: /api/auth ko proxy hone se bachana hai
        source: '/api/:path((?!auth).*)', 
        destination: 'https://timeflow-erp-1.onrender.com/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
