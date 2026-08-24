import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';
import { locales } from './i18n';

const INDEXNOW_KEY = '03a92e0080b24cfaa16c8d475ba543ed';

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle IndexNow key verification - must run before any route matching
  const pathWithoutSlash = pathname.slice(1);
  if (pathWithoutSlash === `${INDEXNOW_KEY}.txt` || pathWithoutSlash === INDEXNOW_KEY) {
    return new NextResponse(INDEXNOW_KEY, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  // Delegate to next-intl middleware for locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|favicon.ico|03a92e0080b24cfaa16c8d475ba543ed.txt).*)'],
};
