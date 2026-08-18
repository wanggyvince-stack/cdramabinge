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
import ArchetypeCard from '@/components/ArchetypeCard';
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

  // Build mood → drama info mapping for the mood engine (grid preview)
  const moodDramaMap: Record<string, Array<{ slug: string; title: string; posterUrl: string | null; rating: number | null }>> = {};
  const moodTotalCounts: Record<string, number> = {};
  for (const mood of ALL_MOODS) {
    const moodDramas = allDramas.filter((d) => {
      const tags = parseJsonArray<string>(d.moodTags);
      return tags.includes(mood);
    });
    moodTotalCounts[mood] = moodDramas.length;
    moodDramaMap[mood] = moodDramas
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6)
      .map((d) => ({
        slug: d.slug,
        title: getLocalizedText(d.titlesJson, locale, d.originalTitle),
        posterUrl: d.posterUrl ? tmdbImage(d.posterUrl, 'w342') : null,
        rating: d.rating || null,
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
            totalCounts={moodTotalCounts}
            locale={locale}
          />
        </section>

        {/* ═══════════════════════════════════════
            ③ Soul Type Quiz CTA — 灵魂测试入口（互动卡片式）
            ═══════════════════════════════════════ */}
        <section className="py-12 md:py-16">
          <div
            className="relative w-full rounded-xl overflow-hidden border"
            style={{ backgroundColor: '#121318', borderColor: 'rgba(100,100,100,0.2)' }}
          >
            <div className="flex flex-col md:flex-row">
              {/* Left 40%: Title + Copy + CTA */}
              <div className="w-full md:w-[40%] p-8 md:p-10 flex flex-col justify-center">
                <h2 className="font-display text-2xl md:text-3xl font-bold tracking-wider mb-3" style={{ color: '#e8e0d0' }}>
                  {locale === 'en' && 'Discover Your C-drama Soul Type'}
                  {locale === 'vi' && 'Khám phá linh hồn phim Hoa của bạn'}
                  {locale === 'th' && 'ค้นพบประเภทจิตวิญญาณซีรีส์จีนของคุณ'}
                </h2>
                <p className="text-sm md:text-base mb-6 leading-relaxed" style={{ color: '#9a9a9a' }}>
                  {locale === 'en' && 'Are you a Hopeless Romantic or a Mind Bender? Take our 2-minute quiz to find your drama-watching archetype.'}
                  {locale === 'vi' && 'Bạn là người Mơ Mộng hay Phân Tích? Làm bài trắc nghiệm 2 phút để khám phá phong cách xem phim.'}
                  {locale === 'th' && 'คุณเป็นสายโรแมนติกหรือนักวิเคราะห์? ทำแบบทดสอบ 2 นาทีเพื่อค้นพบสไตล์การดูซีรีส์'}
                </p>
                <Link
                  href={`/${locale}/quiz`}
                  className="inline-block w-fit px-7 py-3 font-display text-sm tracking-wide rounded-lg transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
                  style={{
                    backgroundColor: '#d4a853',
                    color: '#1a1a1a',
                    boxShadow: '0 4px 14px rgba(212,168,83,0.3)',
                  }}
                >
                  {locale === 'en' && 'Start the Quiz →'}
                  {locale === 'vi' && 'Bắt đầu ngay →'}
                  {locale === 'th' && 'เริ่มทำควิซ →'}
                </Link>
                <p className="mt-4 text-xs" style={{ color: '#666' }}>
                  {locale === 'en' && 'Join 523 drama fans who discovered their type'}
                  {locale === 'vi' && 'Tham gia cùng 523 người hâm mộ đã khám phá'}
                  {locale === 'th' && 'เข้าร่วมกับแฟนซีรีส์ 523 คน'}
                </p>
              </div>

              {/* Right 60%: 4 Archetype cards (2×2) */}
              <div className="w-full md:w-[60%] p-6 md:p-8">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {/* The Hopeless Romantic */}
                  <ArchetypeCard
                    emoji="💕"
                    title={locale === 'en' ? 'The Hopeless Romantic' : locale === 'vi' ? 'Kẻ Mộng Mơ' : 'สายโรแมนติก'}
                    description={locale === 'en' ? 'You watch for the love stories' : locale === 'vi' ? 'Bạn xem vì chuyện tình' : 'คุณดูเพื่อเรื่องราวความรัก'}
                    bgColor="rgba(232,160,176,0.12)"
                    borderColor="rgba(232,160,176,0.25)"
                    titleColor="#e8a0b0"
                    descColor="#b08a8a"
                  />
                  {/* The Mind Bender */}
                  <ArchetypeCard
                    emoji="🧩"
                    title={locale === 'en' ? 'The Mind Bender' : locale === 'vi' ? 'Nhà Phân Tích' : 'นักวิเคราะห์'}
                    description={locale === 'en' ? 'You need plot twists to stay engaged' : locale === 'vi' ? 'Bạn cần plot twist để cuốn hút' : 'คุณต้องการพล็อตหักมุม'}
                    bgColor="rgba(192,168,216,0.12)"
                    borderColor="rgba(192,168,216,0.25)"
                    titleColor="#c0a8d8"
                    descColor="#9a8aaa"
                  />
                  {/* The Emotional Wreck */}
                  <ArchetypeCard
                    emoji="😭"
                    title={locale === 'en' ? 'The Emotional Wreck' : locale === 'vi' ? 'Trái Tim Dễ Tổn Thương' : 'สายซึ้งน้ำตาไหล'}
                    description={locale === 'en' ? 'You cry at least once per drama' : locale === 'vi' ? 'Bạn khóc ít nhất 1 lần mỗi phim' : 'คุณร้องไห้ทุกเรื่อง'}
                    bgColor="rgba(160,200,216,0.12)"
                    borderColor="rgba(160,200,216,0.25)"
                    titleColor="#a0c8d8"
                    descColor="#8aa0aa"
                  />
                  {/* The Thrill Seeker */}
                  <ArchetypeCard
                    emoji="⚡"
                    title={locale === 'en' ? 'The Thrill Seeker' : locale === 'vi' ? 'Kẻ Săn Cảm Giác Mạnh' : 'สายตื่นเต้น'}
                    description={locale === 'en' ? 'You watch dramas like movies — no pausing' : locale === 'vi' ? 'Bạn xem phim như xem điện ảnh' : 'คุณดูซีรีส์เหมือนดูหนัง'}
                    bgColor="rgba(216,160,200,0.12)"
                    borderColor="rgba(216,160,200,0.25)"
                    titleColor="#d8a0c8"
                    descColor="#aa8a9a"
                  />
                </div>
                <p className="text-center text-xs mt-4" style={{ color: '#555' }}>
                  {locale === 'en' ? 'Take the quiz to see yours →' : locale === 'vi' ? 'Làm bài trắc nghiệm để xem kết quả →' : 'ทำแบบทดสอบเพื่อดูผล →'}
                </p>
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
