import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const INDEXNOW_KEY = '03a92e0080b24cfaa16c8d475ba543ed';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle IndexNow key verification
  // Match /key.txt or /key at the root level
  if (pathname === `/${INDEXNOW_KEY}.txt` || pathname === `/${INDEXNOW_KEY}`) {
    return new NextResponse(INDEXNOW_KEY, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match root-level paths that look like IndexNow keys (hex strings)
    '/((?!_next|api|en|vi|th|id|favicon|robots|sitemap).*)',
  ],
};
