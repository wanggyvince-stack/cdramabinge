import { NextResponse } from 'next/server';

const API_KEY = '9a7c89408067f29c28c54ec4438ebd17';
const BASE = 'https://api.themoviedb.org/3';

const DRAMAS = [
  { slug: 'a-little-reunion', tmdb_id: 93088 },
  { slug: 'a-love-so-beautiful', tmdb_id: 75387 },
  { slug: 'are-you-the-one', tmdb_id: 237882 },
  { slug: 'arsenal-military-academy', tmdb_id: 92648 },
  { slug: 'ashes-of-love', tmdb_id: 80884 },
  { slug: 'blossoms-in-adversity', tmdb_id: 248579 },
  { slug: 'bright-eyes-in-the-dark', tmdb_id: 234919 },
  { slug: 'brocade-odyssey', tmdb_id: 258463 },
  { slug: 'day-of-change', tmdb_id: 200737 },
  { slug: 'falling-into-your-smile', tmdb_id: 95486 },
  { slug: 'fated-hearts', tmdb_id: 272484 },
  { slug: 'go-ahead', tmdb_id: 103405 },
  { slug: 'hello-mr-gu', tmdb_id: 122111 },
  { slug: 'hidden-love', tmdb_id: 210733 },
  { slug: 'in-blossom', tmdb_id: 235619 },
  { slug: 'joy-of-life', tmdb_id: 95842 },
  { slug: 'kill-me-love-me', tmdb_id: 243073 },
  { slug: 'lighter-and-princess', tmdb_id: 134331 },
  { slug: 'lost-you-forever', tmdb_id: 210524 },
  { slug: 'love-and-redemption', tmdb_id: 96128 },
  { slug: 'love-between-fairy-and-devil', tmdb_id: 130368 },
  { slug: 'love-game-in-eastern-fantasy', tmdb_id: 243084 },
  { slug: 'love-like-the-galaxy', tmdb_id: 137870 },
  { slug: 'love-o2o', tmdb_id: 66776 },
  { slug: 'meet-yourself', tmdb_id: 216424 },
  { slug: 'moonlight-mystique', tmdb_id: 238680 },
  { slug: 'my-journey-to-you', tmdb_id: 226186 },
  { slug: 'new-life-begins', tmdb_id: 214172 },
  { slug: 'nirvana-in-fire', tmdb_id: 64197 },
  { slug: 'our-interpreter', tmdb_id: 68043 },
  { slug: 'perfect-match', tmdb_id: 254821 },
  { slug: 'put-your-head-on-my-shoulder', tmdb_id: 88548 },
  { slug: 'reset', tmdb_id: 155441 },
  { slug: 'story-of-kunning', tmdb_id: 207197 },
  { slug: 'story-of-minglan', tmdb_id: 81502 },
  { slug: 'the-best-thing', tmdb_id: 256128 },
  { slug: 'the-double', tmdb_id: 236033 },
  { slug: 'the-first-frost', tmdb_id: 250060 },
  { slug: 'the-happy-seven-in-changan', tmdb_id: 244931 },
  { slug: 'the-knockout', tmdb_id: 210757 },
  { slug: 'the-longest-promise', tmdb_id: 130270 },
  { slug: 'the-lost-tomb-2', tmdb_id: 90245 },
  { slug: 'the-princess-royal', tmdb_id: 254474 },
  { slug: 'the-prisoner-of-beauty', tmdb_id: 220269 },
  { slug: 'the-rise-of-ning', tmdb_id: 229036 },
  { slug: 'the-tale-of-rose', tmdb_id: 229202 },
  { slug: 'the-untamed', tmdb_id: 90761 },
  { slug: 'under-the-skin', tmdb_id: 139797 },
  { slug: 'word-of-honor', tmdb_id: 119362 },
  { slug: 'you-are-my-glory', tmdb_id: 127493 },
];

export async function GET() {
  const results: any[] = [];

  for (const drama of DRAMAS) {
    try {
      // Get translations
      const res = await fetch(
        `${BASE}/tv/${drama.tmdb_id}/translations?api_key=${API_KEY}`,
        { next: { revalidate: 0 } }
      );
      const data = await res.json();
      
      const idTrans = data.translations?.find(
        (t: any) => t.iso_639_1 === 'id' && t.iso_3166_1 === 'ID'
      ) || data.translations?.find((t: any) => t.iso_639_1 === 'id');

      if (idTrans?.data?.overview) {
        results.push({
          slug: drama.slug,
          overview_id: idTrans.data.overview,
          title_id: idTrans.data.title || idTrans.data.name || null,
        });
      } else {
        // Get English overview as fallback
        const detailRes = await fetch(
          `${BASE}/tv/${drama.tmdb_id}?api_key=${API_KEY}&language=en-US`,
          { next: { revalidate: 0 } }
        );
        const detailData = await detailRes.json();
        results.push({
          slug: drama.slug,
          overview_id: null,
          overview_en: detailData.overview || null,
        });
      }
    } catch (e: any) {
      results.push({ slug: drama.slug, error: e.message });
    }
  }

  return NextResponse.json({ results });
}
