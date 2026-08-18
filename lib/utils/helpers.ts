/**
 * Shared utility helpers for CDrama Database
 */
import type { CSSProperties } from 'react';

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
 * Mood base hex colors — single source of truth for all mood styling
 */
export const MOOD_HEX: Record<string, string> = {
  wanna_cry: '#a0c8d8',
  light_fun: '#b0d8b8',
  intense: '#d8a0c8',
  romantic: '#e8a0b0',
  mindbending: '#c0a8d8',
  spooky: '#a0b0c0',
  empowering: '#e0c890',
  aesthetic: '#d0a0b8',
};

/**
 * Helper: convert hex + alpha (0-1) to rgba string
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Mood inline styles for light backgrounds — frosted glass effect
 * Uses inline styles to bypass Tailwind opacity variant generation issues.
 * Each entry provides: bg (12% opacity), border (20% opacity), text (solid color)
 */
export const MOOD_LIGHT_STYLES: Record<string, { backgroundColor: string; borderColor: string; color: string }> = {};
for (const [key, hex] of Object.entries(MOOD_HEX)) {
  MOOD_LIGHT_STYLES[key] = {
    backgroundColor: hexToRgba(hex, 0.35),
    borderColor: hexToRgba(hex, 0.50),
    color: hex,
  };
}

/**
 * Mood inline styles for selector buttons — slightly more opaque (15% bg, 25% border)
 */
export const MOOD_SELECTOR_STYLES: Record<string, { backgroundColor: string; borderColor: string; color: string }> = {};
for (const [key, hex] of Object.entries(MOOD_HEX)) {
  MOOD_SELECTOR_STYLES[key] = {
    backgroundColor: hexToRgba(hex, 0.30),
    borderColor: hexToRgba(hex, 0.45),
    color: hex,
  };
}

/**
 * Mood pill tag classes for light backgrounds — base Tailwind classes only (no opacity variants)
 * Combine with MOOD_LIGHT_STYLES inline for colors
 */
export const MOOD_PILL_BASE_CLASS = 'inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-display font-medium tracking-wider backdrop-blur-sm border transition-colors duration-song whitespace-nowrap';

/**
 * Mood pill dark class for hero/dark backgrounds — white frosted glass (inline style)
 */
export const MOOD_PILL_DARK_STYLE: CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.10)',
  borderColor: 'rgba(255,255,255,0.20)',
  color: 'rgba(255,255,255,0.9)',
};
export const MOOD_PILL_DARK_CLASS = 'px-3 py-1 rounded-full backdrop-blur-md border text-xs font-display font-medium tracking-wider whitespace-nowrap';

/**
 * Mood selector button base Tailwind class — no color/opacity (handled by inline style)
 */
export const MOOD_SELECTOR_BASE_CLASS = 'px-8 py-3.5 rounded-full backdrop-blur-sm border font-display text-base tracking-wide transition-all duration-song cursor-pointer hover:scale-105 hover:-translate-y-0.5';

/**
 * @deprecated Use MOOD_LIGHT_STYLES / MOOD_SELECTOR_STYLES inline styles instead.
 * Kept for backward compat but opacity variants are now handled via inline styles.
 */
export const MOOD_PILL_LIGHT_CLASS: Record<string, string> = {};
export const MOOD_SELECTOR_CLASS: Record<string, string> = {};

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
  'youth',
  'crime',
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
