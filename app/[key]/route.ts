import { NextResponse } from 'next/server';

// IndexNow key verification endpoint
// IndexNow requires a {key}.txt file at the root of the domain
// This route handles requests like /your-indexnow-key.txt

export async function GET(
  request: Request,
  { params }: { params: { key: string } }
) {
  const { key } = params;

  // Check if the requested key matches our IndexNow key
  const expectedKey = process.env.INDEXNOW_KEY;

  if (expectedKey && key === expectedKey) {
    return new Response(key, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // Also check if it's a .txt request
  if (key.endsWith('.txt')) {
    const keyWithoutExt = key.replace('.txt', '');
    if (expectedKey && keyWithoutExt === expectedKey) {
      return new Response(keyWithoutExt, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
  }

  return NextResponse.json({ error: 'Key not found' }, { status: 404 });
}
