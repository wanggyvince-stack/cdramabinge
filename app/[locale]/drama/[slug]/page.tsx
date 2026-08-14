export const dynamic = 'force-dynamic';
import { getTranslations, getLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  getLocalizedText,
  parseJsonArray,
  parseJsonObject,
  tmdbImage,
  isPlaceholderPoster,
  fetchTmdbOverview,
  fetchTmdbLocalization,
} from '@/lib/utils/helpers';
import MoodTag from '@/components/MoodTag';
import EditorialComment from '@/components/EditorialComment';
import StreamingBadges from '@/components/StreamingBadges';
import SimilarDramas from '@/components/SimilarDramas';
import FAQ from '@/components/FAQ';
import ShareButtons from '@/components/ShareButtons';
import DramaHeroImages, { DramaPoster } from '@/components/DramaHeroImages';
import type { Metadata } from 'next';

// ────────────────────────────────────────
// Dynamic params
// ────────────────────────────────────────


// ────────────────────────────────────────
// Metadata / SEO
// ────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const { locale, slug } = params;
  const normalizedSlug = slug.toLowerCase().trim();
  const drama = await db.select().from(dramas).where(eq(dramas.slug, normalizedSlug)).get();

  if (!drama) return { title: 'Drama Not Found' };

  const title = getLocalizedText(drama.titlesJson, locale, drama.originalTitle);

  // Resolve real synopsis if template
  let synopsis = getLocalizedText(drama.synopsesJson, locale);
  if (synopsis.startsWith('A captivating')) {
    const tmdbOverview = await fetchTmdbOverview(drama.originalTitle);
    if (tmdbOverview) synopsis = tmdbOverview;
  }

  // Localize title and synopsis for non-English locales via TMDB
  let displayTitle = title;
  let displaySynopsis = synopsis;
  if (locale !== 'en') {
    const localized = await fetchTmdbLocalization(drama.originalTitle, locale);
    if (localized) {
      if (localized.title) displayTitle = localized.title;
      if (localized.overview) displaySynopsis = localized.overview;
    }
  }

  const canonicalUrl = `https://cdramabinge.com/${locale}/drama/${normalizedSlug}`;

  return {
    title: `${displayTitle} (${drama.year || 'N/A'})`,
    description: displaySynopsis.slice(0, 160),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `https://cdramabinge.com/en/drama/${normalizedSlug}`,
        vi: `https://cdramabinge.com/vi/drama/${normalizedSlug}`,
        th: `https://cdramabinge.com/th/drama/${normalizedSlug}`,
      },
    },
    openGraph: {
      title: `${displayTitle} (${drama.year || 'N/A'})`,
      description: displaySynopsis.slice(0, 160),
      url: canonicalUrl,
      type: 'video.tv_show',
      images: drama.posterUrl && !isPlaceholderPoster(drama.posterUrl)
        ? [{ url: tmdbImage(drama.posterUrl, 'w780') }]
        : [],
    },
  };
}

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default async function DramaDetailPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const t = await getTranslations();
  const { locale, slug } = params;

  // Normalize slug to lowercase for case-insensitive matching
  const normalizedSlug = slug.toLowerCase().trim();
  
  // Redirect to canonical lowercase URL if needed
  if (slug !== normalizedSlug) {
    redirect(`/${locale}/drama/${normalizedSlug}`);
  }

  const drama = await db.select().from(dramas).where(eq(dramas.slug, normalizedSlug)).get();
  if (!drama) notFound();

  const title = getLocalizedText(drama.titlesJson, locale, drama.originalTitle);

  // Resolve real synopsis if template
  let synopsis = getLocalizedText(drama.synopsesJson, locale);
  if (synopsis.startsWith('A captivating')) {
    const tmdbOverview = await fetchTmdbOverview(drama.originalTitle);
    if (tmdbOverview) synopsis = tmdbOverview;
  }

  // Localize title and synopsis for non-English locales via TMDB
  let displayTitle = title;
  let displaySynopsis = synopsis;
  if (locale !== 'en') {
    const localized = await fetchTmdbLocalization(drama.originalTitle, locale);
    if (localized) {
      if (localized.title) displayTitle = localized.title;
      if (localized.overview) displaySynopsis = localized.overview;
    }
  }

  const genres = parseJsonArray<string>(drama.genres);
  const moodTags = parseJsonArray<string>(drama.moodTags);
  // Load streaming data from editorial JSON instead of DB
  const streamingDataFile = await import('@/data/streaming.json').then(m => m.default as Record<string, { platforms: Array<{ name: string; url: string; regions: string[] }> }>);
  const dramaStreaming = streamingDataFile[normalizedSlug] || streamingDataFile[drama.slug];
  const similarDramasData = parseJsonObject<Array<{ slug: string; title: string; score: number; reason: string }>>(drama.similarDramasJson);

  // Resolve similar dramas to get poster URLs
  const similarDramasResolved: any[] = [];
  if (similarDramasData && Array.isArray(similarDramasData)) {
    for (const item of similarDramasData.slice(0, 10)) {
      try {
        const similarDrama = await db.select().from(dramas).where(eq(dramas.slug, item.slug)).get();
        if (similarDrama) {
          similarDramasResolved.push({
            slug: similarDrama.slug,
            title: getLocalizedText(similarDrama.titlesJson, locale, similarDrama.originalTitle),
            posterUrl: tmdbImage(similarDrama.posterUrl, 'w342'),
            reason: item.reason || '',
          });
        }
      } catch {
        similarDramasResolved.push({
          slug: item.slug,
          title: item.title || item.slug,
          posterUrl: null,
          reason: item.reason || '',
        });
      }
    }
  }

  // Map streaming.json platforms to StreamingBadges format
  const streamingForRegion = dramaStreaming?.platforms?.map((p) => ({
    platform: p.name,
    url: p.url,
  })) || [];

  // Fetch trailer from TMDB videos API
  let trailerKey: string | null = null;
  if (drama.tmdbId) {
    try {
      const videosRes = await fetch(
        `https://api.themoviedb.org/3/tv/${drama.tmdbId}/videos?language=en-US`,
        {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
          next: { revalidate: 86400 },
        }
      ).then((r) => r.json());

      const videos = videosRes.results ?? [];
      const trailer =
        videos.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer') ||
        videos.find((v: any) => v.site === 'YouTube' && v.type === 'Teaser') ||
        videos.find((v: any) => v.site === 'YouTube');
      if (trailer) trailerKey = trailer.key;
    } catch {
      // Silently ignore — keep "coming soon" placeholder
    }
  }

  // Determine image URLs — use real URLs directly, or let client component fetch
  const posterIsPlaceholder = isPlaceholderPoster(drama.posterUrl);
  const backdropIsPlaceholder = isPlaceholderPoster(drama.backdropUrl);
  const realPosterUrl = posterIsPlaceholder ? undefined : tmdbImage(drama.posterUrl, 'w500');
  const realBackdropUrl = backdropIsPlaceholder ? undefined : tmdbImage(drama.backdropUrl, 'original');

  // FAQ items (generated from drama data)
  const faqItems = [
    {
      question: locale === 'en' ? `What is ${displayTitle} about?` : locale === 'vi' ? `${displayTitle} nói về cái gì?` : `${displayTitle} เกี่ยวกับอะไร?`,
      answer: displaySynopsis.slice(0, 300),
    },
    {
      question: locale === 'en' ? `How many episodes does ${displayTitle} have?` : locale === 'vi' ? `${displayTitle} có bao nhiêu tập?` : `${displayTitle} มีกี่ตอน?`,
      answer: locale === 'en' ? `${displayTitle} has ${drama.episodes || 'N/A'} episodes.` : locale === 'vi' ? `${displayTitle} có ${drama.episodes || 'N/A'} tập.` : `${displayTitle} มี ${drama.episodes || 'N/A'} ตอน`,
    },
    {
      question: locale === 'en' ? `Where can I watch ${displayTitle}?` : locale === 'vi' ? `Tôi có thể xem ${displayTitle} ở đâu?` : `ฉันสามารถดู ${displayTitle} ได้ที่ไหน?`,
      answer: streamingForRegion.length > 0
        ? streamingForRegion.map((s) => s.platform).join(', ')
        : (locale === 'en' ? 'Check your local streaming platforms.' : locale === 'vi' ? 'Kiểm tra nền tảng phát trực tuyến tại địa phương.' : 'ตรวจสอบแพลตฟอร์มสตรีมมิ่งในท้องถิ่นของคุณ'),
    },
  ];

  // JSON-LD Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: displayTitle,
    description: displaySynopsis.slice(0, 300),
    datePublished: drama.year,
    numberOfEpisodes: drama.episodes,
    genre: genres.join(', '),
    aggregateRating: drama.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: drama.rating,
          bestRating: 10,
          worstRating: 1,
          ratingCount: Math.floor(drama.rating * 100),
        }
      : undefined,
    image: realPosterUrl || undefined,
    url: `https://cdramabinge.com/${locale}/drama/${normalizedSlug}`,
    inLanguage: ['zh', 'en', 'vi', 'th'],
  };

  const pageUrl = `https://cdramabinge.com/${locale}/drama/${normalizedSlug}`;

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ═══════════════════════════════════════
          Hero Section — Large backdrop + overlay
          ═══════════════════════════════════════ */}
      <section className="relative w-full h-[70vh] md:h-[75vh] overflow-hidden">
        {/* Backdrop */}
        {realBackdropUrl ? (
          <img
            src={realBackdropUrl}
            alt={displayTitle}
            className="w-full h-full object-cover hero-backdrop"
          />
        ) : (
          <DramaHeroImages
            slug={normalizedSlug}
            initialBackdropUrl={undefined}
            title={displayTitle}
          />
        )}

        {/* Ink wash gradient overlay — lighter for more image visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-sujuan/80 via-sujuan/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />

        {/* Hero content */}
        <div className="absolute inset-x-0 bottom-0 pb-10">
          <div className="max-w-7xl mx-auto px-6 flex items-end gap-6 md:gap-10">
            {/* Poster */}
            <div className="hidden md:block flex-shrink-0 w-48 aspect-[9/14] rounded-song overflow-hidden border-2 border-ivory-border shadow-lg">
              {realPosterUrl ? (
                <img
                  src={realPosterUrl}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <DramaPoster slug={normalizedSlug} title={displayTitle} />
              )}
            </div>

            {/* Title + meta */}
            <div className="flex-1 min-w-0">
              {/* Mood tags */}
              {moodTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {moodTags.map((mood) => (
                    <MoodTag
                      key={mood}
                      mood={mood}
                      label={mood === 'light_fun' ? t('mood.light_fun') : mood === 'mindbending' ? t('mood.mindbending') : mood === 'empowering' ? t('mood.empowering') : t(`mood.${mood}`)}
                      size="md"
                    />
                  ))}
                </div>
              )}

              <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-2 tracking-wider leading-tight">
                {displayTitle}
              </h1>

              <div className="flex items-center gap-4 text-sm text-white/70">
                {drama.year && <span>{drama.year}</span>}
                {drama.rating && (
                  <span className="inline-flex items-center gap-1">
                    <span className="seal-stamp w-7 h-7 rounded text-xs">★</span>
                    <span>{drama.rating.toFixed(1)}</span>
                  </span>
                )}
                {drama.episodes && (
                  <span>{drama.episodes} {t('drama.episodes')}</span>
                )}
                {drama.status && <span>{drama.status}</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          Main Content
          ═══════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6">
        {/* Trailer */}
        <section className="py-8">
          <div className="max-w-3xl mx-auto">
            {trailerKey ? (
              <div className="relative w-full aspect-video rounded-song overflow-hidden bg-dingyao border border-ivory-border">
                <iframe
                  src={`https://www.youtube.com/embed/${trailerKey}`}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                />
              </div>
            ) : (
              <div className="w-full aspect-video bg-dingyao rounded-song border border-ivory-border flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-10 h-10 mx-auto mb-2 text-ink-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  <p className="text-ink-4 text-sm">
                    {locale === 'en' && 'Trailer coming soon'}
                    {locale === 'vi' && 'Sắp có trailer'}
                    {locale === 'th' && 'ตัวอย่างเร็วๆ นี้'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Editorial comment — "30秒追剧指南" */}
        <section className="py-6">
          <EditorialComment
            text={displaySynopsis.slice(0, 250)}
            author={locale === 'en' ? 'CDramaBinge Editors' : locale === 'vi' ? 'Biên tập CDramaBinge' : 'บรรณาธิการ CDramaBinge'}
          />
        </section>

        <div className="crackle-divider my-8" />

        {/* Info cards row */}
        <section className="py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Rating */}
            <div className="song-card p-5 text-center">
              <p className="text-xs text-ink-4 uppercase tracking-wider mb-2">{t('drama.rating')}</p>
              <p className="font-display text-3xl font-bold text-ink-1">
                {drama.rating ? drama.rating.toFixed(1) : '—'}
              </p>
            </div>

            {/* Year */}
            <div className="song-card p-5 text-center">
              <p className="text-xs text-ink-4 uppercase tracking-wider mb-2">{t('drama.year')}</p>
              <p className="font-display text-3xl font-bold text-ink-1">
                {drama.year || '—'}
              </p>
            </div>

            {/* Episodes */}
            <div className="song-card p-5 text-center">
              <p className="text-xs text-ink-4 uppercase tracking-wider mb-2">{t('drama.episodes')}</p>
              <p className="font-display text-3xl font-bold text-ink-1">
                {drama.episodes || '—'}
              </p>
            </div>

            {/* Status */}
            <div className="song-card p-5 text-center">
              <p className="text-xs text-ink-4 uppercase tracking-wider mb-2">{t('drama.status')}</p>
              <p className="font-display text-xl font-bold text-ink-1">
                {drama.status || '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Genres */}
        {genres.length > 0 && (
          <section className="py-4">
            <h3 className="text-sm text-ink-4 uppercase tracking-wider mb-3">{t('drama.genres')}</h3>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1 rounded-song border border-ivory-border text-sm text-ink-3"
                >
                  {genre}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="crackle-divider my-8" />

        {/* Synopsis */}
        <section className="py-6">
          <h2 className="font-display text-2xl font-semibold text-ink-1 mb-4 tracking-wider">
            {t('drama.overview')}
          </h2>
          <p className="text-base text-ink-3 leading-relaxed max-w-3xl">
            {displaySynopsis}
          </p>
        </section>

        <div className="crackle-divider my-8" />

        {/* Where to watch */}
        <section className="py-6">
          <h2 className="font-display text-2xl font-semibold text-ink-1 mb-4 tracking-wider">
            {t('drama.whereToWatch')}
          </h2>
          <StreamingBadges
            streaming={streamingForRegion}
            watchLabel={t('drama.whereToWatch')}
          />
        </section>

        <div className="crackle-divider my-8" />

        {/* Cast — placeholder */}
        <section className="py-6">
          <h2 className="font-display text-2xl font-semibold text-ink-1 mb-6 tracking-wider">
            {t('drama.cast')}
          </h2>
          <div className="flex gap-4 horizontal-scroll song-scrollbar">
            {/* Cast will be populated from database when actor data is available */}
            <div className="flex-shrink-0 w-28 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-dingyao border border-ivory-border flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-ink-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <p className="text-xs text-ink-4">
                {locale === 'en' ? 'Cast info coming soon' : locale === 'vi' ? 'Sắp có thông tin diễn viên' : 'ข้อมูลนักแสดงเร็วๆ นี้'}
              </p>
            </div>
          </div>
        </section>

        <div className="crackle-divider my-8" />

        {/* Similar dramas */}
        <SimilarDramas
          dramas={similarDramasResolved}
          title={t('drama.similar')}
          locale={locale}
        />

        {/* FAQ */}
        <FAQ items={faqItems} title={t('drama.faq')} />

        <div className="crackle-divider my-8" />

        {/* Share buttons */}
        <section className="py-6">
          <ShareButtons
            url={pageUrl}
            title={displayTitle}
            shareLabel={t('common.share')}
          />
        </section>

        {/* Spacer for footer */}
        <div className="h-12" />
      </div>
    </>
  );
}
