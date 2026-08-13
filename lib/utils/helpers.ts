/**
 * Shared utility helpers for CDrama Database
 */

/**
 * Parse a multi-language JSON string and return the value for the given locale
 */
export function getLocalizedText(
  jsonStr: string | null | undefined,
  locale: string,
  fallback?: string
): string {
  if (!jsonStr) return fallback || '';
  try {
    const obj = JSON.parse(jsonStr);
    return obj[locale] || obj.en || fallback || Object.values(obj)[0] as string || '';
  } catch {
    return fallback || '';
  }
}

/**
 * Parse a JSON array string
 */
export function parseJsonArray<T = string>(jsonStr: string | null | undefined): T[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Parse a JSON object
 */
export function parseJsonObject<T = Record<string, unknown>>(
  jsonStr: string | null | undefined
): T | null {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Mood label mapping (pure text, no emoji)
 */
export const MOOD_LABEL: Record<string, string> = {
  wanna_cry: 'Wanna Cry',
  light_fun: 'Light & Fun',
  intense: 'Intense',
  romantic: 'Romantic',
  mindbending: 'Mind-bending',
  spooky: 'Spooky',
  empowering: 'Empowering',
  aesthetic: 'Aesthetic',
};

/**
 * @deprecated Use MOOD_LABEL instead. Kept for backward compat during migration.
 */
export const MOOD_EMOJI: Record<string, string> = MOOD_LABEL;

/**
 * Mood to Tailwind gradient class mapping
 */
export const MOOD_GRADIENT_CLASS: Record<string, string> = {
  wanna_cry: 'bg-mood-cry',
  light_fun: 'bg-mood-fun',
  intense: 'bg-mood-intense',
  romantic: 'bg-mood-romantic',
  mindbending: 'bg-mood-mindbend',
  spooky: 'bg-mood-spooky',
  empowering: 'bg-mood-empower',
  aesthetic: 'bg-mood-aesthetic',
};

/**
 * Mood to solid background class mapping (for pill tags)
 */
export const MOOD_SOLID_CLASS: Record<string, string> = {
  wanna_cry: 'bg-mood-wanna_cry',
  light_fun: 'bg-mood-light_fun',
  intense: 'bg-mood-intense',
  romantic: 'bg-mood-romantic',
  mindbending: 'bg-mood-mindbending',
  spooky: 'bg-mood-spooky',
  empowering: 'bg-mood-empowering',
  aesthetic: 'bg-mood-aesthetic',
};

/**
 * Mood pill tag classes for light backgrounds — frosted glass effect
 * Used in: DramaCard, By Mood list, list pages
 */
export const MOOD_PILL_LIGHT_CLASS: Record<string, string> = {
  wanna_cry: 'backdrop-blur-sm bg-mood-wanna_cry/12 text-mood-wanna_cry border border-mood-wanna_cry/20 hover:bg-mood-wanna_cry/25',
  light_fun: 'backdrop-blur-sm bg-mood-light_fun/12 text-mood-light_fun border border-mood-light_fun/20 hover:bg-mood-light_fun/25',
  intense: 'backdrop-blur-sm bg-mood-intense/12 text-mood-intense border border-mood-intense/20 hover:bg-mood-intense/25',
  romantic: 'backdrop-blur-sm bg-mood-romantic/12 text-mood-romantic border border-mood-romantic/20 hover:bg-mood-romantic/25',
  mindbending: 'backdrop-blur-sm bg-mood-mindbending/12 text-mood-mindbending border border-mood-mindbending/20 hover:bg-mood-mindbending/25',
  spooky: 'backdrop-blur-sm bg-mood-spooky/12 text-mood-spooky border border-mood-spooky/20 hover:bg-mood-spooky/25',
  empowering: 'backdrop-blur-sm bg-mood-empowering/12 text-mood-empowering border border-mood-empowering/20 hover:bg-mood-empowering/25',
  aesthetic: 'backdrop-blur-sm bg-mood-aesthetic/12 text-mood-aesthetic border border-mood-aesthetic/20 hover:bg-mood-aesthetic/25',
};

/**
 * Mood pill dark class for hero/dark backgrounds — white frosted glass
 */
export const MOOD_PILL_DARK_CLASS = 'px-3 py-1 rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-white/90 text-xs font-medium tracking-wide';

/**
 * Mood selector button base class — large frosted pills on light bg
 */
export const MOOD_SELECTOR_BASE_CLASS = 'px-8 py-3.5 rounded-full backdrop-blur-sm border font-display text-base tracking-wide transition-all duration-song cursor-pointer hover:scale-105 hover:-translate-y-0.5';

/**
 * Per-mood selector button classes (semi-transparent colored frosted)
 */
export const MOOD_SELECTOR_CLASS: Record<string, string> = {
  wanna_cry: 'bg-mood-wanna_cry/15 text-mood-wanna_cry border-mood-wanna_cry/25 hover:bg-mood-wanna_cry/25',
  light_fun: 'bg-mood-light_fun/15 text-mood-light_fun border-mood-light_fun/25 hover:bg-mood-light_fun/25',
  intense: 'bg-mood-intense/15 text-mood-intense border-mood-intense/25 hover:bg-mood-intense/25',
  romantic: 'bg-mood-romantic/15 text-mood-romantic border-mood-romantic/25 hover:bg-mood-romantic/25',
  mindbending: 'bg-mood-mindbending/15 text-mood-mindbending border-mood-mindbending/25 hover:bg-mood-mindbending/25',
  spooky: 'bg-mood-spooky/15 text-mood-spooky border-mood-spooky/25 hover:bg-mood-spooky/25',
  empowering: 'bg-mood-empowering/15 text-mood-empowering border-mood-empowering/25 hover:bg-mood-empowering/25',
  aesthetic: 'bg-mood-aesthetic/15 text-mood-aesthetic border-mood-aesthetic/25 hover:bg-mood-aesthetic/25',
};

/**
 * All mood keys
 */
export const ALL_MOODS = [
  'wanna_cry',
  'light_fun',
  'intense',
  'romantic',
  'mindbending',
  'spooky',
  'empowering',
  'aesthetic',
] as const;

/**
 * All genre slugs
 */
export const ALL_GENRES = [
  'romance',
  'historical',
  'fantasy',
  'wuxia',
  'xianxia',
  'modern',
  'thriller',
  'comedy',
  'drama',
  'action',
  'mystery',
  'sci_fi',
] as const;

/**
 * Build TMDB image URL
 */
export function isPlaceholderPoster(url: string | null | undefined): boolean {
  if (!url) return true;
  return url.includes('placeholder_') || url.includes('/placeholder-');
}

export function tmdbImage(path: string | null | undefined, size: 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string {
  if (!path) return '';
  if (isPlaceholderPoster(path)) return '';
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Fetch real overview from TMDB API for a given title.
 * Used to replace template synopsis like "A captivating [genre] drama from [year]."
 */
export async function fetchTmdbOverview(originalTitle: string): Promise<string | null> {
  if (!originalTitle || !process.env.TMDB_API_KEY) return null;
  try {
    const TMDB_BASE = 'https://api.themoviedb.org/3';
    const res = await fetch(
      `${TMDB_BASE}/search/tv?query=${encodeURIComponent(originalTitle)}&language=en-US`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TMDB_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const overview = data.results[0].overview;
      return overview || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch localized title and overview from TMDB for non-English locales.
 * Uses Next.js fetch cache (24h) to avoid repeated API calls.
 */
export async function fetchTmdbLocalization(
  originalTitle: string,
  locale: string
): Promise<{ title?: string; overview?: string } | null> {
  if (locale === 'en') return null;

  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) return null;

  const TMDB_BASE = 'https://api.themoviedb.org/3';
  const langMap: Record<string, string> = { vi: 'vi', th: 'th' };
  const tmdbLang = langMap[locale];
  if (!tmdbLang) return null;

  const headers = {
    'Authorization': `Bearer ${TMDB_API_KEY}`,
    'Accept': 'application/json'
  };

  try {
    // Step 1: Search TMDB to get TV show ID
    const searchRes = await fetch(
      `${TMDB_BASE}/search/tv?query=${encodeURIComponent(originalTitle)}&language=en-US&page=1`,
      { headers, next: { revalidate: 86400 } }
    );

    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    if (!searchData.results?.length) return null;

    const tvId = searchData.results[0].id;

    // Step 2: Get localized details (name + overview in target language)
    const detailRes = await fetch(
      `${TMDB_BASE}/tv/${tvId}?language=${tmdbLang}`,
      { headers, next: { revalidate: 86400 } }
    );

    if (!detailRes.ok) return null;
    const detail = await detailRes.json();

    return {
      title: detail.name || undefined,
      overview: detail.overview || undefined,
    };
  } catch {
    return null;
  }
}
