import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});

export const config = {
  // Match all pathnames except for API routes, _next, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
