const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'mydramalist.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      // IndexNow key verification - rewrite to API route
      {
        source: '/03a92e0080b24cfaa16c8d475ba543ed.txt',
        destination: '/api/indexnow?action=verify',
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
