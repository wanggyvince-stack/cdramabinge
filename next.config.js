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
  // Remove invalid rewrite - will handle IndexNow via middleware instead
};

module.exports = withNextIntl(nextConfig);
