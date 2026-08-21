import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';

// IndexNow API endpoint for manual triggering
// Usage: POST /api/indexnow?key=YOUR_INDEXNOW_KEY
// Or: GET /api/indexnow?key=YOUR_INDEXNOW_KEY (for testing)

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';
const SITE_URL = 'https://cdramabinge.com';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key') || INDEXNOW_KEY;

  if (!key) {
    return NextResponse.json(
      { error: 'Missing INDEXNOW_KEY. Set it in environment variables or pass as ?key= parameter.' },
      { status: 400 }
    );
  }

  try {
    // Collect all URLs to submit
    const urls = await collectAllUrls();

    // Submit to IndexNow
    const result = await submitToIndexNow(urls, key);

    return NextResponse.json({
      success: true,
      submitted: urls.length,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit to IndexNow', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

async function collectAllUrls(): Promise<string[]> {
  const urls: string[] = [];

  // Homepage
  urls.push(`${SITE_URL}/en`);

  // Get all dramas
  const allDramas = await db.select().from(dramas).all();

  for (const drama of allDramas) {
    const slug = drama.slug;

    // Drama detail pages (all locales)
    urls.push(`${SITE_URL}/en/drama/${slug}`);
    urls.push(`${SITE_URL}/vi/drama/${slug}`);
    urls.push(`${SITE_URL}/th/drama/${slug}`);
    urls.push(`${SITE_URL}/id/drama/${slug}`);

    // Dramas-like pages (all locales)
    urls.push(`${SITE_URL}/en/dramas-like/${slug}`);
    urls.push(`${SITE_URL}/vi/dramas-like/${slug}`);
    urls.push(`${SITE_URL}/th/dramas-like/${slug}`);
    urls.push(`${SITE_URL}/id/dramas-like/${slug}`);

    // Actor pages (all locales)
    // Note: We'd need to query actors table too, but for now skip to keep it simple
  }

  // Best/mood pages (all locales)
  const moods = ['romantic', 'intense', 'empowering', 'light_fun', 'mindbending', 'wanna_cry', 'aesthetic', 'spooky'];
  for (const mood of moods) {
    urls.push(`${SITE_URL}/en/best/${mood}`);
    urls.push(`${SITE_URL}/vi/best/${mood}`);
    urls.push(`${SITE_URL}/th/best/${mood}`);
    urls.push(`${SITE_URL}/id/best/${mood}`);
  }

  // Genre pages
  const genres = ['romance', 'historical', 'wuxia', 'modern', 'fantasy', 'mystery', 'comedy'];
  for (const genre of genres) {
    urls.push(`${SITE_URL}/en/best/${genre}`);
    urls.push(`${SITE_URL}/vi/best/${genre}`);
    urls.push(`${SITE_URL}/th/best/${genre}`);
    urls.push(`${SITE_URL}/id/best/${genre}`);
  }

  return [...new Set(urls)]; // Remove duplicates
}

async function submitToIndexNow(urls: string[], key: string) {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      host: 'cdramabinge.com',
      key: key,
      keyLocation: `${SITE_URL}/${key}.txt`,
      urlList: urls,
    }),
  });

  if (response.status === 200 || response.status === 202) {
    return { status: 'accepted', message: 'URLs submitted successfully' };
  } else {
    const text = await response.text();
    throw new Error(`IndexNow API returned ${response.status}: ${text}`);
  }
}
