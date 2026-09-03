import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { notifyIndexNow, getDramaUrls } from '@/lib/indexnow';

// IndexNow API endpoint — SE-04 refactored
// GET /api/indexnow?action=verify     — key verification
// GET /api/indexnow                   — submit ALL site URLs
// GET /api/indexnow?slugs=slug1,slug2 — submit specific drama URLs only
// POST /api/indexnow                  — same as GET (body: { slugs?: string[] })

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '03a92e0080b24cfaa16c8d475ba543ed';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Key verification
  if (action === 'verify') {
    return new Response(INDEXNOW_KEY, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    // Check for targeted slug submission
    const slugsParam = searchParams.get('slugs');
    let urls: string[];

    if (slugsParam) {
      // Targeted submission: only submit URLs for specific slugs
      const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean);
      urls = slugs.flatMap((slug) => getDramaUrls(slug));
    } else {
      // Full submission: collect all site URLs
      urls = await collectAllUrls();
    }

    const result = await notifyIndexNow(urls);

    return NextResponse.json({
      success: result.status === 'accepted',
      submitted: result.submitted,
      total_urls: urls.length,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit to IndexNow', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const slugs: string[] | undefined = body.slugs;

    if (slugs && Array.isArray(slugs) && slugs.length > 0) {
      // Targeted submission via POST body
      const urls = slugs.flatMap((slug) => getDramaUrls(slug));
      const result = await notifyIndexNow(urls);
      return NextResponse.json({
        success: result.status === 'accepted',
        submitted: result.submitted,
        total_urls: urls.length,
        error: result.error,
      });
    }

    // Fall back to full submission
    return GET(request);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit to IndexNow', details: String(error) },
      { status: 500 }
    );
  }
}

async function collectAllUrls(): Promise<string[]> {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cdramabinge.com';
  const LOCALES = ['en', 'vi', 'th', 'id'] as const;
  const urls: string[] = [];

  // Homepage (all locales)
  for (const locale of LOCALES) {
    urls.push(`${SITE_URL}/${locale}`);
  }

  // Drama detail + dramas-like pages (all locales)
  const allDramas = await db.select({ slug: dramas.slug }).from(dramas).all();
  for (const drama of allDramas) {
    for (const locale of LOCALES) {
      urls.push(`${SITE_URL}/${locale}/drama/${drama.slug}`);
      urls.push(`${SITE_URL}/${locale}/dramas-like/${drama.slug}`);
    }
  }

  // Quiz page (all locales)
  for (const locale of LOCALES) {
    urls.push(`${SITE_URL}/${locale}/quiz`);
  }

  // Starter-pack page (all locales)
  for (const locale of LOCALES) {
    urls.push(`${SITE_URL}/${locale}/starter-pack`);
  }

  // Best/mood/genre category pages (all 20 categories × all locales)
  const categories = [
    'romance', 'historical', 'fantasy', 'wuxia', 'xianxia',
    'modern', 'thriller', 'comedy', 'drama', 'action', 'mystery', 'sci_fi',
    'wanna_cry', 'light_fun', 'intense', 'romantic', 'mindbending',
    'spooky', 'empowering', 'aesthetic',
  ];
  for (const cat of categories) {
    for (const locale of LOCALES) {
      urls.push(`${SITE_URL}/${locale}/best/${cat}`);
    }
  }

  // Actors listing page (all locales)
  for (const locale of LOCALES) {
    urls.push(`${SITE_URL}/${locale}/actors`);
  }

  // Actor detail pages — REMOVED (SEO-03: noindex, follow)
  // Actor pages are now noindex; no need to submit to IndexNow.

  // Blog pages (English only)
  urls.push(`${SITE_URL}/en/blog`);
  try {
    const { getAllArticles } = await import('@/lib/blog');
    const articles = getAllArticles();
    for (const article of articles) {
      urls.push(`${SITE_URL}/en/blog/${article.slug}`);
    }
  } catch {
    // blog module may not be available in all environments
  }

  return Array.from(new Set(urls));
}
