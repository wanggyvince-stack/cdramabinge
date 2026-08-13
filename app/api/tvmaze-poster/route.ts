import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isPlaceholderPoster } from '@/lib/utils/helpers';
import { searchTVmazeByTitle, searchTVmazeByImdb } from '@/lib/utils/tvmaze';

/**
 * TVmaze Poster & Synopsis API
 *
 * This is the fallback data source when TMDB doesn't have results.
 * TVmaze is free (no API key) and has a 20 req/s rate limit.
 *
 * Query params:
 *   - slug: drama slug (looks up title from DB)
 *   - title: direct English title search
 *   - imdb_id: direct IMDb ID lookup
 *
 * Returns: { posterUrl, synopsis, tvmazeId }
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const title = request.nextUrl.searchParams.get('title');
  const imdbId = request.nextUrl.searchParams.get('imdb_id');

  if (!slug && !title && !imdbId) {
    return NextResponse.json({
      posterUrl: null,
      synopsis: null,
      tvmazeId: null,
      error: 'Missing query: provide slug, title, or imdb_id',
    });
  }

  try {
    let searchTitle = title;
    let dramaSlug = slug;

    // If we only have a slug, resolve the title from DB
    if (!searchTitle && !imdbId && dramaSlug) {
      const drama = await db
        .select()
        .from(dramas)
        .where(eq(dramas.slug, dramaSlug))
        .get();

      if (!drama) {
        return NextResponse.json({
          posterUrl: null,
          synopsis: null,
          tvmazeId: null,
          error: `Drama not found: ${dramaSlug}`,
        });
      }

      // Parse titles — prefer English title
      try {
        if (drama.titlesJson) {
          const titles = JSON.parse(drama.titlesJson);
          if (titles.en) searchTitle = titles.en;
        }
      } catch {}

      // Fall back to original title
      if (!searchTitle && drama.originalTitle) {
        searchTitle = drama.originalTitle;
      }
    }

    // Try IMDb lookup first (most precise)
    if (imdbId) {
      const result = await searchTVmazeByImdb(imdbId);
      if (result) {
        // Update DB if we have a slug and poster is still placeholder
        if (dramaSlug && result.poster_url) {
          await tryUpdateDb(dramaSlug, result.poster_url, result.synopsis);
        }
        return NextResponse.json({
          posterUrl: result.poster_url,
          synopsis: result.synopsis,
          tvmazeId: result.tvmaze_id,
        });
      }
    }

    // Then try title search
    if (searchTitle) {
      const result = await searchTVmazeByTitle(searchTitle);
      if (result) {
        if (dramaSlug && result.poster_url) {
          await tryUpdateDb(dramaSlug, result.poster_url, result.synopsis);
        }
        return NextResponse.json({
          posterUrl: result.poster_url,
          synopsis: result.synopsis,
          tvmazeId: result.tvmaze_id,
        });
      }
    }

    return NextResponse.json({
      posterUrl: null,
      synopsis: null,
      tvmazeId: null,
      error: 'No TVmaze results found',
      searchedFor: searchTitle || imdbId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      posterUrl: null,
      synopsis: null,
      tvmazeId: null,
      error: 'Unexpected error',
      debug: message,
    });
  }
}

/**
 * Try to update DB with TVmaze poster/synopsis (only replaces placeholders).
 * Silently ignores errors (e.g. read-only filesystem on Vercel).
 */
async function tryUpdateDb(
  slug: string,
  posterUrl: string | null,
  synopsis: string | null
) {
  try {
    const drama = await db
      .select()
      .from(dramas)
      .where(eq(dramas.slug, slug))
      .get();

    if (!drama) return;

    const updates: Partial<Record<'posterUrl' | 'synopsesJson', string>> = {};

    if (posterUrl && isPlaceholderPoster(drama.posterUrl)) {
      updates.posterUrl = posterUrl;
    }

    // Update synopsis if it's a template placeholder (contains "A captivating" or similar)
    if (synopsis && drama.synopsesJson) {
      try {
        const synopses = JSON.parse(drama.synopsesJson);
        const enSynopsis = synopses.en || '';
        const isTemplate =
          enSynopsis.includes('A captivating') ||
          (enSynopsis.startsWith('A ') && enSynopsis.includes('from 20'));
        if (isTemplate) {
          synopses.en = synopsis;
          updates.synopsesJson = JSON.stringify(synopses);
        }
      } catch {}
    }

    if (Object.keys(updates).length > 0) {
      await db.update(dramas).set(updates).where(eq(dramas.slug, slug));
    }
  } catch {
    // Ignore DB write errors
  }
}
