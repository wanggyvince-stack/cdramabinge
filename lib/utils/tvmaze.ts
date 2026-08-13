/**
 * TVmaze API utilities
 * TVmaze is a free TV show database — no API key required.
 * Rate limit: 20 requests/second
 * Docs: https://www.tvmaze.com/api
 */

export interface TVMazeShow {
  id: number;
  name: string;
  summary: string | null; // HTML string
  image: {
    original: string | null;
    medium: string | null;
  } | null;
  externals: {
    imdb: string | null;
    thetvdb: number | null;
  };
  genres: string[];
  status: string;
  premiered: string | null;
  ended: string | null;
  network: { name: string; country: { name: string } } | null;
}

export interface TVMazeSearchResult {
  score: number;
  show: TVMazeShow;
}

export interface TVMazeResult {
  poster_url: string | null;
  synopsis: string | null;
  tvmaze_id: number;
}

const TVMAZE_BASE = 'https://api.tvmaze.com';

/**
 * Strip HTML tags from TVmaze summary (it returns HTML).
 */
function stripHtml(html: string | null): string | null {
  if (!html) return null;
  // Simple tag stripping + decode common entities
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
  return text || null;
}

/**
 * Search TVmaze by show title.
 */
export async function searchTVmazeByTitle(title: string): Promise<TVMazeResult | null> {
  if (!title) return null;

  try {
    const url = `${TVMAZE_BASE}/search/shows?q=${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 * 7 }, // Cache 7 days — show data rarely changes
    });

    if (!res.ok) return null;

    const data: TVMazeSearchResult[] = await res.json();
    if (!data || data.length === 0) return null;

    // Prefer exact match, otherwise take first result
    const exact = data.find(
      (r) => r.show.name?.toLowerCase() === title.toLowerCase()
    );
    const show = exact ? exact.show : data[0].show;

    const posterUrl = show.image?.original || show.image?.medium || null;
    const synopsis = stripHtml(show.summary);

    return {
      poster_url: posterUrl,
      synopsis: synopsis,
      tvmaze_id: show.id,
    };
  } catch {
    return null;
  }
}

/**
 * Look up a show by IMDb ID via TVmaze.
 */
export async function searchTVmazeByImdb(imdbId: string): Promise<TVMazeResult | null> {
  if (!imdbId) return null;

  try {
    const url = `${TVMAZE_BASE}/lookup/shows?imdb=${encodeURIComponent(imdbId)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 * 7 },
    });

    if (!res.ok) return null;

    const show: TVMazeShow = await res.json();
    if (!show?.id) return null;

    const posterUrl = show.image?.original || show.image?.medium || null;
    const synopsis = stripHtml(show.summary);

    return {
      poster_url: posterUrl,
      synopsis: synopsis,
      tvmaze_id: show.id,
    };
  } catch {
    return null;
  }
}

/**
 * Look up a show by TVmaze ID.
 */
export async function getTVmazeShowById(id: number): Promise<TVMazeResult | null> {
  try {
    const url = `${TVMAZE_BASE}/shows/${id}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 * 7 },
    });

    if (!res.ok) return null;

    const show: TVMazeShow = await res.json();
    const posterUrl = show.image?.original || show.image?.medium || null;
    const synopsis = stripHtml(show.summary);

    return {
      poster_url: posterUrl,
      synopsis: synopsis,
      tvmaze_id: show.id,
    };
  } catch {
    return null;
  }
}
