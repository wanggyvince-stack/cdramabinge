import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales } from './i18n';

const INDEXNOW_KEY = '03a92e0080b24cfaa16c8d475ba543ed';

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});

// Slug redirects (old -> new)
const SLUG_REDIRECTS: Record<string, string> = {
  'drama-a04f3efb': 'decisive-battle-1936',
};

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

  // Handle slug redirects
  const dramaMatch = pathname.match(/^\/([^/]+)\/drama\/([^/]+)$/);
  if (dramaMatch) {
    const [, locale, oldSlug] = dramaMatch;
    if (SLUG_REDIRECTS[oldSlug]) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/drama/${SLUG_REDIRECTS[oldSlug]}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // SE-02: Blog is English-only — redirect non-EN blog routes to /en/blog
  const blogMatch = pathname.match(/^\/(vi|th|id)(\/blog(?:\/.*)?)$/);
  if (blogMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/en${blogMatch[2]}`;
    return NextResponse.redirect(url, 301);
  }

  // Delegate to next-intl middleware for locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|favicon.*\\.png|favicon\\.ico|apple-touch-icon\\.png|android-chrome-.*\\.png|og-image\\.png|sitemap.xml|robots.txt|03a92e0080b24cfaa16c8d475ba543ed.txt).*)'],
};
