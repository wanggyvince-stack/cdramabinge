import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const INDEXNOW_KEY = '03a92e0080b24cfaa16c8d475ba543ed';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle IndexNow key verification - must run before any route matching
  // Match exactly /key.txt or /key at the root level (single segment)
  const pathWithoutSlash = pathname.slice(1); // Remove leading slash
  
  if (pathWithoutSlash === `${INDEXNOW_KEY}.txt` || pathWithoutSlash === INDEXNOW_KEY) {
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
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
