export const dynamic = 'force-dynamic';
import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import HeroCarousel from '@/components/HeroCarousel';
import DramaCard from '@/components/DramaCard';
import MoodButton from '@/components/MoodButton';
import EditorialComment from '@/components/EditorialComment';
import {
  getLocalizedText,
  parseJsonArray,
  MOOD_EMOJI,
  MOOD_GRADIENT_CLASS,
  ALL_MOODS,
  ALL_GENRES,
  tmdbImage,
} from '@/lib/utils/helpers';

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

  const carouselItems = (editorial.hero_carousel || [])
    .filter((item: { active: boolean }) => item.active)
    .map((item: { drama_slug: string; title_override: Record<string, string>; comment: Record<string, string>; badge_text: string }) => {
      const drama = heroDramaMap.get(item.drama_slug.trim());
      return {
        slug: item.drama_slug.trim(),
        title: item.title_override?.[locale] || item.title_override?.en || drama?.originalTitle || item.drama_slug,
        backdropUrl: drama ? (tmdbImage(drama.backdropUrl, 'original') || null) : null,
        comment: item.comment?.[locale] || item.comment?.en || '',
        badge: item.badge_text || '🔥 Trending',
      };
    });

  // Fetch editor's picks
  const pickSlugs = (editorial.editors_picks || [])
    .filter((item: { active: boolean }) => item.active)
    .map((item: { drama_slug: string }) => item.drama_slug.trim());
  const pickDramas = await getDramasBySlugs(pickSlugs);
  const pickDramaMap = new Map(pickDramas.map((d) => [d.slug.trim(), d]));

  const editorsPickItems = (editorial.editors_picks || [])
    .filter((item: { active: boolean }) => item.active)
    .map((item: { drama_slug: string; title_override: Record<string, string>; comment: Record<string, string> }) => {
      const drama = pickDramaMap.get(item.drama_slug.trim());
      return {
        slug: item.drama_slug.trim(),
        title: item.title_override?.[locale] || item.title_override?.en || drama?.originalTitle || item.drama_slug,
        posterUrl: drama ? (tmdbImage(drama.posterUrl, 'w500') || null) : null,
        comment: item.comment?.[locale] || item.comment?.en || '',
        year: drama?.year,
        moods: drama ? parseJsonArray(drama.moodTags) : [],
      };
    });

  // Get all dramas for "Just Premiered" and mood mapping
  const allDramas = await getAllDramas();

  // Just Premiered: sort by year desc, take 8
  const justPremiered = allDramas
    .filter((d) => d.year && d.year >= 2023)
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .slice(0, 8);

  // Build mood → drama slugs mapping for the mood engine
  const moodDramaMap: Record<string, string[]> = {};
  for (const mood of ALL_MOODS) {
    moodDramaMap[mood] = allDramas
      .filter((d) => {
        const tags = parseJsonArray<string>(d.moodTags);
        return tags.includes(mood);
      })
      .slice(0, 10)
      .map((d) => d.slug);
  }

  return (
    <div>
      {/* ═══════════════════════════════════════
          ① Hero Carousel — 热点轮播区
          ═══════════════════════════════════════ */}
      <HeroCarousel
        items={carouselItems}
        locale={locale}
        trendingLabel={t('home.heroTrending')}
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

          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {ALL_MOODS.map((mood) => (
              <MoodButton
                key={mood}
                mood={mood}
                label={t(`mood.${mood}`)}
                locale={locale}
                dramaSlugs={moodDramaMap[mood] || []}
              />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════
            ③ Virus Test CTA — 病毒测试横幅
            ═══════════════════════════════════════ */}
        <section className="py-8">
          <div className="relative w-full h-[120px] rounded-song overflow-hidden bg-gradient-to-r from-ruyao/20 via-ruyao/10 to-ruyao/20 border border-ivory-border flex items-center">
            {/* Crackle texture decoration */}
            <div className="absolute inset-0 crackle-bg opacity-30" />

            <div className="relative z-10 flex items-center justify-between w-full px-8 md:px-12">
              <div>
                <p className="font-display text-xl md:text-2xl text-ink-2 tracking-wide">
                  {t('home.quizCta')}
                </p>
                <p className="text-sm text-ink-4 mt-1">
                  {locale === 'en' && 'Take our viral quiz and discover your C-drama personality'}
                  {locale === 'vi' && 'Làm bài kiểm tra viral và khám phá tính cách phim Hoa của bạn'}
                  {locale === 'th' && 'ทำควิซไวรัสและค้นพบบุคลิกซีรีส์จีนของคุณ'}
                </p>
              </div>

              {/* Seal-style quiz icon */}
              <div className="hidden md:flex seal-stamp w-16 h-16 rounded-lg text-2xl flex-shrink-0">
                Quiz
              </div>
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
              <EditorialComment text={editorsPickItems[0].comment} author="CDramaDB Editors" />
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
              const title = getLocalizedText(drama.titlesJson, locale, drama.originalTitle);
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
                const title = getLocalizedText(drama.titlesJson, locale, drama.originalTitle);
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
            {ALL_MOODS.map((mood) => (
              <Link
                key={mood}
                href={`/${locale}/best/${mood}`}
                className="px-5 py-2.5 rounded-song border border-ivory-border text-sm text-ink-3 hover:bg-dingyao transition-colors duration-song inline-flex items-center gap-2 glaze-hover"
              >
                <span>{MOOD_EMOJI[mood]}</span>
                <span>{t(`mood.${mood}`)}</span>
              </Link>
            ))}
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
                className="px-5 py-2.5 rounded-song border border-ivory-border text-sm text-ink-3 hover:bg-dingyao transition-colors duration-song glaze-hover"
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
