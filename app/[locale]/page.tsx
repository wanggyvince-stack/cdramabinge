export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import HeroCarousel from '@/components/HeroCarousel';
import DramaCard from '@/components/DramaCard';
import MoodDiscoverySection from '@/components/MoodDiscoverySection';
import EditorialComment from '@/components/EditorialComment';
import {
  getLocalizedText,
  parseJsonArray,
  MOOD_LIGHT_STYLES,
  ALL_MOODS,
  ALL_GENRES,
  tmdbImage,
  fetchTmdbLocalization,
} from '@/lib/utils/helpers';

// ────────────────────────────────────────
// Homepage Metadata
// ────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const canonicalUrl = `https://cdramabinge.com/${locale}`;

  return {
    title: 'CDramaBinge — Your Guide to Chinese Dramas',
    description:
      'Discover the best Chinese dramas — curated recommendations, mood-based browsing, and in-depth guides.',
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: 'https://cdramabinge.com/en',
        vi: 'https://cdramabinge.com/vi',
        th: 'https://cdramabinge.com/th',
        'x-default': 'https://cdramabinge.com/en',
      },
    },
    openGraph: {
      title: 'CDramaBinge — Your Guide to Chinese Dramas',
      description:
        'Discover the best Chinese dramas — curated recommendations, mood-based browsing, and in-depth guides.',
      url: canonicalUrl,
      type: 'website',
      siteName: 'CDramaBinge',
      images: [{ url: 'https://cdramabinge.com/api/og?type=home', width: 1200, height: 630, alt: 'CDramaBinge' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'CDramaBinge — Your Guide to Chinese Dramas',
      description: 'Discover the best Chinese dramas — curated recommendations, mood-based browsing, and in-depth guides.',
      images: ['https://cdramabinge.com/api/og?type=home'],
    },
  };
}

// ────────────────────────────────────────
// Data fetching helpers
// ────────────────────────────────────────

function loadEditorialData() {
  try {
    const filePath = join(process.cwd(), 'data', 'editorial.json');
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { hero_carousel: [], editors_picks: [] };
  }
}

async function getDramasBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [];
  try {
    const results = await db
      .select()
      .from(dramas)
      .where(inArray(dramas.slug, slugs))
      .all();
    return results;
  } catch {
    return [];
  }
}

async function getAllDramas() {
  try {
    return await db.select().from(dramas).all();
  } catch {
    return [];
  }
}

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const editorial = loadEditorialData();

  // Fetch hero carousel dramas
  const heroSlugs = (editorial.hero_carousel || [])
    .filter((item: { active: boolean }) => item.active)
    .map((item: { drama_slug: string }) => item.drama_slug);
  const heroDramas = await getDramasBySlugs(heroSlugs);
  const heroDramaMap = new Map(heroDramas.map((d) => [d.slug.trim(), d]));

  // Fetch editor's picks
  const pickSlugs = (editorial.editors_picks || [])
    .filter((item: { active: boolean }) => item.active)
    .map((item: { drama_slug: string }) => item.drama_slug.trim());
  const pickDramas = await getDramasBySlugs(pickSlugs);
  const pickDramaMap = new Map(pickDramas.map((d) => [d.slug.trim(), d]));

  // Get all dramas for "Just Premiered" and mood mapping
  const allDramas = await getAllDramas();

  // Just Premiered: sort by year desc, take 8
  const justPremiered = allDramas
    .filter((d) => d.year && d.year >= 2023)
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .slice(0, 8);

  // Fetch TMDB localizations for non-English locales
  // Collect all unique dramas that need localization (carousel + editor's picks + just premiered)
  const allDramasForLocalization = new Map<string, string>();
  for (const d of heroDramas) {
    if (!allDramasForLocalization.has(d.slug)) {
      allDramasForLocalization.set(d.slug, d.originalTitle);
    }
  }
  for (const d of pickDramas) {
    if (!allDramasForLocalization.has(d.slug)) {
      allDramasForLocalization.set(d.slug, d.originalTitle);
    }
  }
  for (const d of justPremiered) {
    if (!allDramasForLocalization.has(d.slug)) {
      allDramasForLocalization.set(d.slug, d.originalTitle);
    }
  }

  // Fetch localizations in parallel (cached by Next.js for 24h)
  const localizationEntries = await Promise.all(
    Array.from(allDramasForLocalization.entries()).map(async ([slug, originalTitle]) => {
      const localized = await fetchTmdbLocalization(originalTitle, locale);
      return [slug, localized] as const;
    })
  );
  const localizationMap = new Map<string, { title?: string; overview?: string } | null>(
    localizationEntries
  );

  const carouselItems = (editorial.hero_carousel || [])
    .filter((item: { active: boolean }) => item.active)
    .map((item: { drama_slug: string; title_override: Record<string, string>; comment: Record<string, string> }) => {
      const drama = heroDramaMap.get(item.drama_slug.trim());
      const slug = item.drama_slug.trim();
      let title = item.title_override?.[locale] || item.title_override?.en || drama?.originalTitle || item.drama_slug;
      // Use TMDB localization for non-English if no locale-specific override
      if (locale !== 'en' && !item.title_override?.[locale]) {
        const loc = localizationMap.get(slug);
        if (loc?.title) title = loc.title;
      }
      return {
        slug,
        title,
        backdropUrl: drama ? (tmdbImage(drama.backdropUrl, 'original') || null) : null,
        comment: item.comment?.[locale] || item.comment?.en || '',
      };
    });

  const editorsPickItems = (editorial.editors_picks || [])
    .filter((item: { active: boolean }) => item.active)
    .map((item: { drama_slug: string; title_override: Record<string, string>; comment: Record<string, string> }) => {
      const drama = pickDramaMap.get(item.drama_slug.trim());
      const slug = item.drama_slug.trim();
      let title = item.title_override?.[locale] || item.title_override?.en || drama?.originalTitle || item.drama_slug;
      // Use TMDB localization for non-English if no locale-specific override
      if (locale !== 'en' && !item.title_override?.[locale]) {
        const loc = localizationMap.get(slug);
        if (loc?.title) title = loc.title;
      }
      return {
        slug,
        title,
        posterUrl: drama ? (tmdbImage(drama.posterUrl, 'w500') || null) : null,
        comment: item.comment?.[locale] || item.comment?.en || '',
        year: drama?.year,
        moods: drama ? parseJsonArray(drama.moodTags) : [],
      };
    });

  // Build mood → drama info mapping for the mood engine
  const moodDramaMap: Record<string, Array<{ slug: string; title: string; posterUrl: string | null }>> = {};
  for (const mood of ALL_MOODS) {
    moodDramaMap[mood] = allDramas
      .filter((d) => {
        const tags = parseJsonArray<string>(d.moodTags);
        return tags.includes(mood);
      })
      .slice(0, 10)
      .map((d) => ({
        slug: d.slug,
        title: getLocalizedText(d.titlesJson, locale, d.originalTitle),
        posterUrl: d.posterUrl ? tmdbImage(d.posterUrl, 'w342') : null,
      }));
  }

  return (
    <div>
      {/* ═══════════════════════════════════════
          ① Hero Carousel — 热点轮播区
          ═══════════════════════════════════════ */}
      <HeroCarousel
        items={carouselItems}
        locale={locale}
      />

      <div className="max-w-7xl mx-auto px-6">
        {/* ═══════════════════════════════════════
            ② Mood Discovery Engine — 情绪发现引擎
            ═══════════════════════════════════════ */}
        <section className="py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink-1 tracking-wider mb-3">
              {t('home.vibeTitle')}
            </h2>
            <p className="text-base text-ink-4">
              {t('home.vibeSubtitle')}
            </p>
          </div>

          <MoodDiscoverySection
            moods={ALL_MOODS}
            labels={{
              wanna_cry: t('mood.wanna_cry'),
              light_fun: t('mood.light_fun'),
              intense: t('mood.intense'),
              romantic: t('mood.romantic'),
              mindbending: t('mood.mindbending'),
              spooky: t('mood.spooky'),
              empowering: t('mood.empowering'),
              aesthetic: t('mood.aesthetic'),
            }}
            dramaMap={moodDramaMap}
            locale={locale}
          />
        </section>

        {/* ═══════════════════════════════════════
            ③ Soul Type Quiz CTA — 灵魂测试入口
            ═══════════════════════════════════════ */}
        <section className="py-12 md:py-16">
          <div className="relative w-full rounded-song overflow-hidden bg-gradient-to-br from-zhusha/8 via-sujuan to-zhusha/5 border border-ivory-border p-10 md:p-14 text-center">
            {/* Decorative crackle texture */}
            <div className="absolute inset-0 crackle-bg opacity-20" />

            <div className="relative z-10">
              {/* Decorative seal */}
              <div className="mx-auto w-14 h-14 rounded-song bg-zhusha/10 border border-zhusha/30 flex items-center justify-center mb-6">
                <span className="font-display text-2xl text-zhusha">?</span>
              </div>

              <h2 className="font-display text-2xl md:text-3xl font-bold text-ink-1 tracking-wider mb-3">
                {locale === 'en' && 'Discover Your C-drama Soul Type'}
                {locale === 'vi' && 'Khám phá linh hồn phim Hoa của bạn'}
                {locale === 'th' && 'ค้นพบประเภทจิตวิญญาณซีรีส์จีนของคุณ'}
              </h2>
              <p className="text-sm md:text-base text-ink-4 mb-8 max-w-md mx-auto">
                {locale === 'en' && 'Take our 7-question quiz to find your drama-watching archetype'}
                {locale === 'vi' && 'Trả lời 7 câu hỏi để khám phá phong cách xem phim của bạn'}
                {locale === 'th' && 'ตอบ 7 คำถามเพื่อค้นพบสไตล์การดูซีรีส์ของคุณ'}
              </p>

              <Link
                href={`/${locale}/quiz`}
                className="inline-block px-8 py-3 bg-zhusha text-white font-display text-base tracking-wide rounded-song hover:bg-zhusha/90 transition-all duration-song hover:scale-105 hover:-translate-y-0.5 shadow-md shadow-zhusha/15"
              >
                {locale === 'en' && 'Start the Quiz'}
                {locale === 'vi' && 'Bắt đầu ngay'}
                {locale === 'th' && 'เริ่มทำควิซ'}
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            ④ Editor's Picks — 编辑精选
            ═══════════════════════════════════════ */}
        <section className="py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-1 mb-8 tracking-wider">
            {t('home.editorsPicks')}
          </h2>

          <div className="horizontal-scroll song-scrollbar">
            <div className="flex gap-5 pb-4">
              {editorsPickItems.map((item: { slug: string; title: string; posterUrl: string | null; comment: string; year?: number; moods: string[] }) => (
                <div key={item.slug} className="flex-shrink-0 w-44">
                  <DramaCard
                    slug={item.slug}
                    title={item.title}
                    posterUrl={item.posterUrl}
                    moods={item.moods}
                    moodLabels={{
                      wanna_cry: t('mood.wanna_cry'),
                      light_fun: t('mood.light_fun'),
                      intense: t('mood.intense'),
                      romantic: t('mood.romantic'),
                      mindbending: t('mood.mindbending'),
                      spooky: t('mood.spooky'),
                      empowering: t('mood.empowering'),
                      aesthetic: t('mood.aesthetic'),
                    }}
                    comment={item.comment}
                    year={item.year}
                    locale={locale}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Featured editorial comment */}
          {editorsPickItems[0]?.comment && (
            <div className="mt-8 max-w-xl">
              <EditorialComment text={editorsPickItems[0].comment} author="CDramaBinge Editors" />
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════
            ⑤ Just Premiered — 新剧速递
            ═══════════════════════════════════════ */}
        <section className="py-16 md:py-20">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-1 mb-8 tracking-wider">
            {t('home.justPremiered')}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {justPremiered.map((drama) => {
              let title = getLocalizedText(drama.titlesJson, locale, drama.originalTitle);
              // Use TMDB localization for non-English locales
              if (locale !== 'en') {
                const loc = localizationMap.get(drama.slug);
                if (loc?.title) title = loc.title;
              }
              const moodTags = parseJsonArray<string>(drama.moodTags);
              return (
                <DramaCard
                  key={drama.slug}
                  slug={drama.slug}
                  title={title}
                  posterUrl={tmdbImage(drama.posterUrl, 'w500') || null}
                  moods={moodTags.slice(0, 2)}
                  moodLabels={{
                    wanna_cry: t('mood.wanna_cry'),
                    light_fun: t('mood.light_fun'),
                    intense: t('mood.intense'),
                    romantic: t('mood.romantic'),
                    mindbending: t('mood.mindbending'),
                    spooky: t('mood.spooky'),
                    empowering: t('mood.empowering'),
                    aesthetic: t('mood.aesthetic'),
                  }}
                  year={drama.year}
                  locale={locale}
                />
              );
            })}
          </div>

          {/* Fallback if no recent dramas */}
          {justPremiered.length === 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {allDramas.slice(0, 8).map((drama) => {
                let title = getLocalizedText(drama.titlesJson, locale, drama.originalTitle);
                // Use TMDB localization for non-English locales
                if (locale !== 'en') {
                  const loc = localizationMap.get(drama.slug);
                  if (loc?.title) title = loc.title;
                }
                return (
                  <DramaCard
                    key={drama.slug}
                    slug={drama.slug}
                    title={title}
                    posterUrl={tmdbImage(drama.posterUrl, 'w500') || null}
                    year={drama.year}
                    locale={locale}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════
            ⑥ Browse by — 分类浏览
            ═══════════════════════════════════════ */}
        <section className="py-16 md:py-20 mb-8">
          {/* By Mood */}
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-1 mb-6 tracking-wider">
            {t('home.browseMood')}
          </h2>
          <div className="flex flex-wrap gap-3 mb-12">
            {ALL_MOODS.map((mood) => {
              const moodStyle = MOOD_LIGHT_STYLES[mood] || MOOD_LIGHT_STYLES['romantic'];
              return (
                <Link
                  key={mood}
                  href={`/${locale}/best/${mood}`}
                  className="px-6 py-2.5 rounded-full text-sm font-medium tracking-wide transition-colors duration-song backdrop-blur-sm border"
                  style={moodStyle}
                >
                  {t(`mood.${mood}`)}
                </Link>
              );
            })}
          </div>

          {/* By Genre */}
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-1 mb-6 tracking-wider">
            {t('home.browseGenre')}
          </h2>
          <div className="flex flex-wrap gap-3">
            {ALL_GENRES.map((genre) => (
              <Link
                key={genre}
                href={`/${locale}/best/${genre}`}
                className="px-5 py-2.5 rounded-full bg-dingyao/50 text-ink-3 border border-ivory-border/60 text-sm tracking-wide hover:bg-dingyao hover:text-ink-1 transition-colors duration-song"
              >
                {t(`genre.${genre}`)}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
