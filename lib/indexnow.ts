/**
 * IndexNow shared module — SE-04
 *
 * Centralized IndexNow submission logic used by:
 * - app/api/indexnow/route.ts (manual/full submission)
 * - app/api/expand/route.ts (auto-submit after expansion)
 * - Sandbox scripts via /api/indexnow?slugs=slug1,slug2
 */

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '03a92e0080b24cfaa16c8d475ba543ed';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cdramabinge.com';

const LOCALES = ['en', 'vi', 'th', 'id'] as const;

export interface IndexNowResult {
  submitted: number;
  status: 'accepted' | 'error';
  error?: string;
}

/**
 * Submit a list of URLs to IndexNow.
 * Non-throwing — errors are returned in the result object so callers
 * can decide whether to block on failure.
 */
export async function notifyIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (urls.length === 0) {
    return { submitted: 0, status: 'accepted' };
  }

  try {
    const response = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'cdramabinge.com',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });

    if (response.status === 200 || response.status === 202) {
      return { submitted: urls.length, status: 'accepted' };
    }

    const text = await response.text().catch(() => '');
    return {
      submitted: 0,
      status: 'error',
      error: `IndexNow returned ${response.status}: ${text}`,
    };
  } catch (err) {
    return {
      submitted: 0,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Generate all locale URLs for a single drama slug.
 * Includes both /drama/{slug} and /dramas-like/{slug}.
 */
export function getDramaUrls(slug: string): string[] {
  const urls: string[] = [];
  for (const locale of LOCALES) {
    urls.push(`${SITE_URL}/${locale}/drama/${slug}`);
    urls.push(`${SITE_URL}/${locale}/dramas-like/${slug}`);
  }
  return urls;
}

/**
 * Generate URLs for multiple drama slugs (batch).
 */
export function getBatchDramaUrls(slugs: string[]): string[] {
  return slugs.flatMap((slug) => getDramaUrls(slug));
}
