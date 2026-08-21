import { NextResponse } from 'next/server';

// IndexNow key verification endpoint
// IndexNow requires a {key}.txt file at the root of the domain
// This route handles requests like /03a92e0080b24cfaa16c8d475ba543ed.txt
// The file must contain only the key string.

const INDEXNOW_KEY = '03a92e0080b24cfaa16c8d475ba543ed';

export async function GET(
  request: Request,
  { params }: { params: { key: string } }
) {
  const { key } = params;

  // Handle /key.txt requests (IndexNow verification)
  if (key.endsWith('.txt')) {
    const keyWithoutExt = key.replace('.txt', '');
    if (keyWithoutExt === INDEXNOW_KEY) {
      // Return the key as plain text (IndexNow requirement)
      return new Response(INDEXNOW_KEY, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  }

  // Handle /key requests (without .txt extension)
  if (key === INDEXNOW_KEY) {
    return new Response(INDEXNOW_KEY, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  return NextResponse.json({ error: 'Key not found' }, { status: 404 });
}
