import { NextResponse } from 'next/server';

const API_KEY = '9a7c89408067f29c28c54ec4438ebd17';
const BASE = 'https://api.themoviedb.org/3';

const TVMAZE_DRAMAS = [
  { slug: 'the-untamed', tmdb_id: 90761 },
  { slug: 'word-of-honor', tmdb_id: 119362 },
  { slug: 'nirvana-in-fire', tmdb_id: 64197 },
  { slug: 'love-between-fairy-and-devil', tmdb_id: 130368 },
  { slug: 'hidden-love', tmdb_id: 210733 },
  { slug: 'ashes-of-love', tmdb_id: 80884 },
  { slug: 'the-longest-promise', tmdb_id: 130270 },
  { slug: 'reset', tmdb_id: 155441 },
  { slug: 'the-knockout', tmdb_id: 210757 },
  { slug: 'meet-yourself', tmdb_id: 216424 },
  { slug: 'love-like-the-galaxy', tmdb_id: 137870 },
  { slug: 'joy-of-life', tmdb_id: 95842 },
  { slug: 'a-little-reunion', tmdb_id: 93088 },
  { slug: 'story-of-kunning', tmdb_id: 207197 },
];

export async function GET() {
  const results = [];

  for (const drama of TVMAZE_DRAMAS) {
    try {
      const res = await fetch(`${BASE}/tv/${drama.tmdb_id}/images?api_key=${API_KEY}`, {
        next: { revalidate: 0 },
      });
      const data = await res.json();
      const posters = data.posters || [];
      if (posters.length > 0) {
        posters.sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0));
        results.push({
          slug: drama.slug,
          poster_path: posters[0].file_path,
          vote: posters[0].vote_average,
        });
      } else {
        results.push({ slug: drama.slug, poster_path: null, error: 'No posters found' });
      }
    } catch (e: any) {
      results.push({ slug: drama.slug, poster_path: null, error: e.message });
    }
  }

  return NextResponse.json({ results });
}
