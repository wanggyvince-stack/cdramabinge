export const dynamic = 'force-dynamic';
import { getTranslations, getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  getLocalizedText,
  parseJsonArray,
  parseJsonObject,
  tmdbImage,
} from '@/lib/utils/helpers';
import DramaCard from '@/components/DramaCard';
import EditorialComment from '@/components/EditorialComment';
import type { Metadata } from 'next';

// ────────────────────────────────────────
// Dynamic params
// ────────────────────────────────────────

export async function generateStaticParams() {
  try {
    const allDramas = await db.select({ slug: dramas.slug }).from(dramas).all();
    return allDramas.map((d) => ({ slug: d.slug }));
  } catch {
    return [];
  }
}

// ────────────────────────────────────────
// Metadata
// ────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const { locale, slug } = params;
  const drama = await db.select().from(dramas).where(eq(dramas.slug, slug)).get();

  if (!drama) return { title: 'Drama Not Found' };

  const title = getLocalizedText(drama.titlesJson, locale, drama.originalTitle);
  const suffix = locale === 'en' ? 'Dramas like' : locale === 'vi' ? 'Phim giống' : 'ซีรีส์ที่คล้าย';

  return {
    title: `${suffix} ${title} — CDramaDB`,
    description: locale === 'en'
      ? `Top 10 C-dramas similar to ${title}. AI-powered recommendations based on mood, genre, and storytelling style.`
      : locale === 'vi'
        ? `Top 10 phim Hoa giống ${title}. Đề xuất AI dựa trên tâm trạng, thể loại và phong cách kể chuyện.`
        : `10 ซีรีส์จีนที่คล้าย ${title} คำแนะนำ AI ตามอารมณ์ แนว และสไตล์การเล่าเรื่อง`,
  };
}

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default async function DramasLikePage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const t = await getTranslations();
  const { locale, slug } = params;

  const drama = await db.select().from(dramas).where(eq(dramas.slug, slug)).get();
  if (!drama) notFound();

  const title = getLocalizedText(drama.titlesJson, locale, drama.originalTitle);
  const similarDramasData = parseJsonObject<Array<{ slug: string; title: string; score: number; reason: string }>>(drama.similarDramasJson);

  // Resolve similar dramas
  const similarDramas: any[] = [];
  if (similarDramasData && Array.isArray(similarDramasData)) {
    for (const item of similarDramasData.slice(0, 10)) {
      try {
        const similarDrama = await db.select().from(dramas).where(eq(dramas.slug, item.slug.trim())).get();
        if (similarDrama) {
          similarDramas.push({
            slug: similarDrama.slug,
            title: getLocalizedText(similarDrama.titlesJson, locale, similarDrama.originalTitle),
            posterUrl: tmdbImage(similarDrama.posterUrl, 'w500'),
            reason: item.reason || '',
            score: item.score || 0,
            year: similarDrama.year,
            rating: similarDrama.rating,
            moods: parseJsonArray<string>(similarDrama.moodTags),
          });
        }
      } catch {
        similarDramas.push({
          slug: item.slug,
          title: item.title || item.slug,
          posterUrl: null,
          reason: item.reason || '',
          score: item.score || 0,
          year: null,
          rating: null,
          moods: [],
        });
      }
    }
  }

  // If no precomputed similar dramas, find by shared genres/moods
  if (similarDramas.length === 0) {
    try {
      const allDramas = await db.select().from(dramas).all();
      const sourceGenres = parseJsonArray<string>(drama.genres).map((g) => g.toLowerCase());
      const sourceMoods = parseJsonArray<string>(drama.moodTags);

      const scored = allDramas
        .filter((d) => d.slug !== drama.slug)
        .map((d) => {
          const dGenres = parseJsonArray<string>(d.genres).map((g) => g.toLowerCase());
          const dMoods = parseJsonArray<string>(d.moodTags);
          const genreOverlap = sourceGenres.filter((g) => dGenres.includes(g)).length;
          const moodOverlap = sourceMoods.filter((m) => dMoods.includes(m)).length;
          return { drama: d, score: genreOverlap * 2 + moodOverlap * 3 };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      for (const item of scored) {
        similarDramas.push({
          slug: item.drama.slug,
          title: getLocalizedText(item.drama.titlesJson, locale, item.drama.originalTitle),
          posterUrl: tmdbImage(item.drama.posterUrl, 'w500'),
          reason: '',
          score: item.score,
          year: item.drama.year,
          rating: item.drama.rating,
          moods: parseJsonArray<string>(item.drama.moodTags),
        });
      }
    } catch {
      // Ignore
    }
  }

  const suffix = locale === 'en' ? 'Dramas like' : locale === 'vi' ? 'Phim giống' : 'ซีรีส์ที่คล้าย';

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${suffix} ${title}`,
    numberOfItems: similarDramas.length,
    itemListElement: similarDramas.map((d, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: d.title,
      url: `https://cdramadb.com/${locale}/drama/${d.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="mb-12">
          <p className="text-sm text-ink-4 uppercase tracking-wider mb-2">
            {locale === 'en' ? 'AI Recommendations' : locale === 'vi' ? 'Đề xuất AI' : 'คำแนะนำ AI'}
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-1 mb-4 tracking-wider">
            {suffix}{' '}
            <Link
              href={`/${locale}/drama/${slug}`}
              className="text-ruyao hover:text-ruyao/80 transition-colors duration-song"
            >
              {title}
            </Link>
          </h1>
          <p className="text-base text-ink-3 max-w-2xl leading-relaxed">
            {locale === 'en'
              ? `Our AI analyzed ${title}'s mood, genre, and storytelling style to find these 10 matching C-dramas you'll love.`
              : locale === 'vi'
                ? `AI phân tích tâm trạng, thể loại và phong cách kể chuyện của ${title} để tìm 10 bộ phim Hoa phù hợp.`
                : `AI วิเคราะห์อารมณ์ แนว และสไตล์การเล่าเรื่อง ของ ${title} เพื่อหาซีรีส์จีน 10 เรื่องที่คุณจะชอบ`}
          </p>
        </header>

        <div className="crackle-divider mb-12" />

        {/* Similar dramas — Top 10 ranked list */}
        <div className="space-y-0">
          {similarDramas.map((item, index) => (
            <Link
              key={item.slug}
              href={`/${locale}/drama/${item.slug}`}
              className="group"
            >
              <div className="flex items-stretch gap-5 py-5 border-b border-ivory-border/50 hover:bg-dingyao/50 transition-colors duration-song rounded-song px-4">
                {/* Rank */}
                <div className="flex-shrink-0 w-10 flex items-center justify-center">
                  <span className={`font-display text-2xl font-bold ${
                    index < 3 ? 'text-zhusha' : 'text-ink-5'
                  }`}>
                    {index + 1}
                  </span>
                </div>

                {/* Poster */}
                <div className="flex-shrink-0 w-16 md:w-20 aspect-[9/14] rounded-song overflow-hidden">
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-dingyao flex items-center justify-center">
                      <span className="text-ink-5 text-lg font-display">剧</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-display text-base md:text-lg font-semibold text-ink-1 group-hover:text-ruyao transition-colors duration-song leading-tight mb-1">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-ink-4 mb-2">
                    {item.year && <span>{item.year}</span>}
                    {item.rating && <span>★ {item.rating.toFixed(1)}</span>}
                  </div>
                  {item.reason && (
                    <p className="text-sm text-ink-3 line-clamp-2 leading-relaxed">
                      {item.reason}
                    </p>
                  )}
                </div>

                {/* Match score indicator */}
                <div className="hidden md:flex flex-shrink-0 items-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-ruyao/30 flex items-center justify-center mb-1">
                      <span className="font-display text-sm font-bold text-ruyao">
                        {Math.round(Math.min(item.score * 10, 99))}%
                      </span>
                    </div>
                    <span className="text-[10px] text-ink-4 uppercase tracking-wider">
                      {locale === 'en' ? 'match' : locale === 'vi' ? 'phù hợp' : 'ตรง'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {similarDramas.length === 0 && (
          <div className="text-center py-20">
            <p className="text-ink-4 text-lg">
              {locale === 'en'
                ? `No similar dramas found yet. Our AI is still learning about ${title}!`
                : locale === 'vi'
                  ? `Chưa tìm thấy phim tương tự. AI vẫn đang học về ${title}!`
                  : `ยังไม่พบซีรีส์ที่คล้ายกัน AI กำลังเรียนรู้เกี่ยวกับ ${title}!`}
            </p>
          </div>
        )}

        <div className="h-12" />
      </div>
    </>
  );
}
