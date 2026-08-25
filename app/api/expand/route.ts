import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

const SECRET = 'cdrama-expand-2026';

/**
 * POST /api/expand
 * Expand drama database with new dramas from TMDB.
 * 
 * Body: { dramas: [{ zh_name: string, ref_slug?: string }], secret: string }
 * Returns: { results: DramaExpandResult[] }
 * 
 * Each result contains:
 * - tmdb_id, poster_url, backdrop_url, original_title, slug
 * - genres, synopsis_en, synopsis_zh, synopsis_vi, synopsis_th, synopsis_id
 * - cast: { name, character, tmdb_person_id, photo_url }[]
 * - trailer_key (YouTube)
 * - not_found: true if TMDB search failed
 */

interface DramaInput {
  zh_name: string;
  ref_slug?: string;
}

interface CastMember {
  name: string;
  character: string;
  tmdb_person_id: number;
  photo_url: string | null;
}

interface DramaExpandResult {
  zh_name: string;
  found: boolean;
  tmdb_id?: number;
  poster_url?: string;
  backdrop_url?: string;
  original_title?: string;
  slug?: string;
  genres?: string[];
  synopsis_en?: string;
  synopsis_zh?: string;
  synopsis_vi?: string;
  synopsis_th?: string;
  synopsis_id?: string;
  cast?: CastMember[];
  trailer_key?: string | null;
  number_of_episodes?: number;
  first_air_date?: string;
  status?: string;
  error?: string;
}

async function tmdbFetch(url: string, retries = 2): Promise<any> {
  const headers = {
    'Authorization': `Bearer ${TMDB_API_KEY}`,
    'Accept': 'application/json',
  };
  
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return await res.json();
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      if (res.status === 404) return null;
      return null;
    } catch {
      if (i < retries) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function searchTMDB(zhName: string): Promise<any> {
  // Try Chinese title search first
  const zhSearchUrl = `${TMDB_BASE}/search/tv?query=${encodeURIComponent(zhName)}&language=zh-CN&page=1&include_adult=false`;
  const zhData = await tmdbFetch(zhSearchUrl);
  
  if (zhData?.results?.length > 0) {
    // Prefer exact match
    const exact = zhData.results.find(
      (r: any) => r.name === zhName || r.original_name === zhName
    );
    return exact || zhData.results[0];
  }
  
  // Try without adult filter
  const zhSearchUrl2 = `${TMDB_BASE}/search/tv?query=${encodeURIComponent(zhName)}&language=zh-CN&page=1`;
  const zhData2 = await tmdbFetch(zhSearchUrl2);
  if (zhData2?.results?.length > 0) {
    return zhData2.results[0];
  }
  
  return null;
}

async function getDetails(tmdbId: number): Promise<any> {
  // Get full details with external IDs
  const url = `${TMDB_BASE}/tv/${tmdbId}?language=en-US&append_to_response=external_ids,credits,videos`;
  return await tmdbFetch(url);
}

async function getChineseSynopsis(tmdbId: number): Promise<string | null> {
  const url = `${TMDB_BASE}/tv/${tmdbId}/translations`;
  const data = await tmdbFetch(url);
  if (!data?.translations) return null;
  
  const zhTranslation = data.translations.find((t: any) => t.iso_639_1 === 'zh');
  if (zhTranslation?.data?.overview) {
    return zhTranslation.data.overview;
  }
  return null;
}

async function translateWithDeepL(text: string, targetLang: string): Promise<string> {
  if (!DEEPL_API_KEY) return text;
  if (!text || text.trim().length === 0) return text;
  
  try {
    const res = await fetch(DEEPL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang.toUpperCase(),
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      return data.translations?.[0]?.text || text;
    }
    return text;
  } catch {
    return text;
  }
}

async function expandOneDrama(input: DramaInput): Promise<DramaExpandResult> {
  const { zh_name } = input;
  
  try {
    // Step 1: Search TMDB
    const tmdbResult = await searchTMDB(zh_name);
    if (!tmdbResult) {
      return { zh_name, found: false, error: 'Not found on TMDB' };
    }
    
    const tmdbId = tmdbResult.id;
    
    // Step 2: Get full details
    const details = await getDetails(tmdbId);
    if (!details) {
      return { zh_name, found: false, error: 'Failed to get details' };
    }
    
    // Step 3: Build poster/backdrop URLs
    const posterPath = details.poster_path || tmdbResult.poster_path;
    const backdropPath = details.backdrop_path || tmdbResult.backdrop_path;
    const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w780${posterPath}` : null;
    const backdropUrl = backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : null;
    
    // Step 4: Get English synopsis
    const synopsisEn = details.overview || '';
    
    // Step 5: Get Chinese synopsis from translations (fallback to DeepL)
    let synopsisZh: string | null = null;
    try {
      synopsisZh = await getChineseSynopsis(tmdbId);
    } catch {}
    
    // Step 6: Get genres
    const genres = (details.genres || []).map((g: any) => g.name);
    
    // Step 7: Get cast (top 10)
    const castData = details.credits?.cast || [];
    const cast: CastMember[] = castData.slice(0, 10).map((c: any) => ({
      name: c.name,
      character: c.character || '',
      tmdb_person_id: c.id,
      photo_url: c.profile_path ? `https://image.tmdb.org/t/p/w300${c.profile_path}` : null,
    }));
    
    // Step 8: Get trailer
    const videos = details.videos?.results || [];
    const trailer = videos.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer')
      || videos.find((v: any) => v.site === 'YouTube' && v.type === 'Teaser')
      || videos.find((v: any) => v.site === 'YouTube');
    const trailerKey = trailer?.key || null;
    
    // Step 9: Build slug from name
    const slugBase = (details.name || zh_name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = slugBase || input.ref_slug || zh_name.toLowerCase().replace(/\s+/g, '-');
    
    // Step 10: Translate synopsis
    // DeepL supports: ZH, EN, DE, FR, ES, PT, IT, NL, PL, RU, JA, KO, etc.
    // DeepL does NOT support: VI (Vietnamese), TH (Thai), ID (Indonesian)
    // For unsupported languages, we store English as fallback (to be translated later)
    
    const finalZh = synopsisZh || (synopsisEn ? await translateWithDeepL(synopsisEn, 'ZH') : '');
    
    // For VI/TH/ID: store English synopsis as placeholder
    // These will need manual translation or a different translation service
    const finalVi = synopsisEn; // placeholder - English
    const finalTh = synopsisEn; // placeholder - English
    const finalId = synopsisEn; // placeholder - English
    
    return {
      zh_name,
      found: true,
      tmdb_id: tmdbId,
      poster_url: posterUrl || undefined,
      backdrop_url: backdropUrl || undefined,
      original_title: details.name || zh_name,
      slug,
      genres,
      synopsis_en: synopsisEn,
      synopsis_zh: finalZh || synopsisEn,
      synopsis_vi: finalVi,
      synopsis_th: finalTh,
      synopsis_id: finalId,
      cast,
      trailer_key: trailerKey,
      number_of_episodes: details.number_of_episodes,
      first_air_date: details.first_air_date,
      status: details.status,
    };
    
  } catch (err: any) {
    return { zh_name, found: false, error: err.message };
  }
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-expand-secret');
  if (secret !== SECRET) {
    // Also check query param
    const { searchParams } = new URL(request.url);
    if (searchParams.get('secret') !== SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 });
  }
  
  try {
    const body = await request.json();
    const dramaInputs: DramaInput[] = body.dramas || [];
    
    if (dramaInputs.length === 0) {
      return NextResponse.json({ error: 'No dramas provided' }, { status: 400 });
    }
    
    const results: DramaExpandResult[] = [];
    
    // Process one at a time to respect rate limits
    for (let i = 0; i < dramaInputs.length; i++) {
      const result = await expandOneDrama(dramaInputs[i]);
      results.push(result);
      
      // Rate limit: wait between requests
      if (i < dramaInputs.length - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    
    return NextResponse.json({ 
      results,
      found_count: results.filter(r => r.found).length,
      not_found_count: results.filter(r => !r.found).length,
    });
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
