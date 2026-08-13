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
 * Mood emoji mapping
 */
export const MOOD_EMOJI: Record<string, string> = {
  wanna_cry: '😭',
  light_fun: '😂',
  intense: '🔥',
  romantic: '🥰',
  mindbending: '🤯',
  spooky: '👻',
  empowering: '💪',
  aesthetic: '🌸',
};

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
