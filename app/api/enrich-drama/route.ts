import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

/**
 * Comprehensive TMDB enrichment endpoint.
 * Given a title (and optional Chinese title), returns:
 * - tmdb_id, poster_path, backdrop_path
 * - trailer YouTube key (if available)
 * 
 * Query params:
 * - title: English or pinyin title (required)
 * - zh_title: Chinese title (optional, for fallback search)
 * - year: Release year (optional, helps narrow search)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const zhTitle = searchParams.get('zh_title');
  const year = searchParams.get('year');

  if (!title && !zhTitle) {
    return NextResponse.json({ error: 'Missing title or zh_title' }, { status: 400 });
  }

  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 });
  }

  const headers = {
    'Authorization': `Bearer ${TMDB_API_KEY}`,
    'Accept': 'application/json',
  };

  try {
    // Step 1: Search TMDB for the TV show
    let result: any = null;

    // Try English/primary title first
    if (title) {
      const searchUrl = `${TMDB_BASE}/search/tv?query=${encodeURIComponent(title)}&language=en-US&page=1${year ? `&first_air_date_year=${year}` : ''}`;
      const res = await fetch(searchUrl, { headers, next: { revalidate: 86400 } });
      if (res.ok) {
        const data = await res.json();
        if (data.results?.length > 0) {
          // Prefer exact match
          result = data.results.find(
            (r: any) => r.name?.toLowerCase() === title.toLowerCase()
          ) || data.results[0];
        }
      }
    }

    // Fallback to Chinese title
    if (!result && zhTitle) {
      const zhSearchUrl = `${TMDB_BASE}/search/tv?query=${encodeURIComponent(zhTitle)}&language=zh-CN&page=1${year ? `&first_air_date_year=${year}` : ''}`;
      const zhRes = await fetch(zhSearchUrl, { headers, next: { revalidate: 86400 } });
      if (zhRes.ok) {
        const zhData = await zhRes.json();
        if (zhData.results?.length > 0) {
          result = zhData.results.find(
            (r: any) => r.name?.toLowerCase() === zhTitle.toLowerCase()
          ) || zhData.results[0];
        }
      }
    }

    if (!result) {
      return NextResponse.json({ found: false, error: 'No TMDB results' });
    }

    const tmdbId = result.id;
    const posterPath = result.poster_path || null;
    const backdropPath = result.backdrop_path || null;

    // Step 2: Fetch videos (trailer) for this show
    let trailerKey: string | null = null;
    try {
      // Try English videos first
      const videosRes = await fetch(
        `${TMDB_BASE}/tv/${tmdbId}/videos?language=en-US`,
        { headers, next: { revalidate: 86400 } }
      );
      if (videosRes.ok) {
        const videosData = await videosRes.json();
        const videos = videosData.results ?? [];
        const trailer =
          videos.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
          videos.find((v: any) => v.site === 'YouTube' && v.type === 'Teaser') ||
          videos.find((v: any) => v.site === 'YouTube');
        if (trailer) trailerKey = trailer.key;
      }

      // If no English trailer, try Chinese
      if (!trailerKey) {
        const zhVideosRes = await fetch(
          `${TMDB_BASE}/tv/${tmdbId}/videos?language=zh-CN`,
          { headers, next: { revalidate: 86400 } }
        );
        if (zhVideosRes.ok) {
          const zhVideosData = await zhVideosRes.json();
          const zhVideos = zhVideosData.results ?? [];
          const zhTrailer =
            zhVideos.find((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) ||
            zhVideos.find((v: any) => v.site === 'YouTube');
          if (zhTrailer) trailerKey = zhTrailer.key;
        }
      }
    } catch {}

    return NextResponse.json({
      found: true,
      tmdb_id: tmdbId,
      poster_path: posterPath,
      backdrop_path: backdropPath,
      poster_url: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
      backdrop_url: backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : null,
      trailer_key: trailerKey,
      trailer_url: trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null,
      name: result.name,
      original_name: result.original_name,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
