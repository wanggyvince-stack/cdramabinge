export const dynamic = 'force-dynamic';
import { getTranslations, getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  getLocalizedText,
  parseJsonArray,
  parseJsonObject,
  tmdbImage,
} from '@/lib/utils/helpers';
import MoodTag from '@/components/MoodTag';
import EditorialComment from '@/components/EditorialComment';
import StreamingBadges from '@/components/StreamingBadges';
import SimilarDramas from '@/components/SimilarDramas';
import FAQ from '@/components/FAQ';
import ShareButtons from '@/components/ShareButtons';
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
// Metadata / SEO
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
  const synopsis = getLocalizedText(drama.synopsesJson, locale);
  const canonicalUrl = `https://cdramadb.com/${locale}/drama/${slug}`;

  return {
    title: `${title} (${drama.year || 'N/A'}) — CDramaDB`,
    description: synopsis.slice(0, 160),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `/en/drama/${slug}`,
        vi: `/vi/drama/${slug}`,
        th: `/th/drama/${slug}`,
      },
    },
    openGraph: {
      title: `${title} — CDramaDB`,
      description: synopsis.slice(0, 160),
      url: canonicalUrl,
      type: 'video.tv_show',
      images: drama.posterUrl ? [{ url: tmdbImage(drama.posterUrl, 'w780') }] : [],
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

  const drama = await db.select().from(dramas).where(eq(dramas.slug, slug)).get();
  if (!drama) notFound();

  const title = getLocalizedText(drama.titlesJson, locale, drama.originalTitle);
  const synopsis = getLocalizedText(drama.synopsesJson, locale);
  const genres = parseJsonArray<string>(drama.genres);
  const moodTags = parseJsonArray<string>(drama.moodTags);
  const streaming = parseJsonObject<Record<string, Array<{ platform: string; url: string }>>>(drama.streamingJson);
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

  // Streaming for current locale region
  const regionMap: Record<string, string> = { en: 'US', vi: 'VN', th: 'TH' };
  const region = regionMap[locale] || 'US';
  const streamingForRegion = streaming?.[region] || [];

  // FAQ items (generated from drama data)
  const faqItems = [
    {
      question: locale === 'en' ? `What is ${title} about?` : locale === 'vi' ? `${title} nói về cái gì?` : `${title} เกี่ยวกับอะไร?`,
      answer: synopsis.slice(0, 300),
    },
    {
      question: locale === 'en' ? `How many episodes does ${title} have?` : locale === 'vi' ? `${title} có bao nhiêu tập?` : `${title} มีกี่ตอน?`,
      answer: locale === 'en' ? `${title} has ${drama.episodes || 'N/A'} episodes.` : locale === 'vi' ? `${title} có ${drama.episodes || 'N/A'} tập.` : `${title} มี ${drama.episodes || 'N/A'} ตอน`,
    },
    {
      question: locale === 'en' ? `Where can I watch ${title}?` : locale === 'vi' ? `Tôi có thể xem ${title} ở đâu?` : `ฉันสามารถดู ${title} ได้ที่ไหน?`,
      answer: streamingForRegion.length > 0
        ? streamingForRegion.map((s) => s.platform).join(', ')
        : (locale === 'en' ? 'Check your local streaming platforms.' : locale === 'vi' ? 'Kiểm tra nền tảng phát trực tuyến tại địa phương.' : 'ตรวจสอบแพลตฟอร์มสตรีมมิ่งในท้องถิ่นของคุณ'),
    },
  ];

  // JSON-LD Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: title,
    description: synopsis.slice(0, 300),
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
    image: drama.posterUrl ? tmdbImage(drama.posterUrl, 'w780') : undefined,
    url: `https://cdramadb.com/${locale}/drama/${slug}`,
    inLanguage: ['zh', 'en', 'vi', 'th'],
  };

  const pageUrl = `https://cdramadb.com/${locale}/drama/${slug}`;

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
      <section className="relative w-full h-[50vh] md:h-[65vh] overflow-hidden">
        {/* Backdrop */}
        {drama.backdropUrl ? (
          <img
            src={tmdbImage(drama.backdropUrl, 'original')}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ink-2 to-ink-3" />
        )}

        {/* Ink wash gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-sujuan via-sujuan/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

        {/* Hero content */}
        <div className="absolute inset-x-0 bottom-0 pb-10">
          <div className="max-w-7xl mx-auto px-6 flex items-end gap-6 md:gap-10">
            {/* Poster */}
            <div className="hidden md:block flex-shrink-0 w-48 aspect-[9/14] rounded-song overflow-hidden border-2 border-ivory-border shadow-lg">
              {drama.posterUrl ? (
                <img
                  src={tmdbImage(drama.posterUrl, 'w500')}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-dingyao flex items-center justify-center">
                  <span className="text-ink-5 text-3xl font-display">剧</span>
                </div>
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
                {title}
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
        {/* Video placeholder */}
        <section className="py-8">
          <div className="w-full aspect-video bg-dingyao rounded-song border border-ivory-border flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl mb-2 block">🎬</span>
              <p className="text-ink-4 text-sm">
                {locale === 'en' && 'Trailer coming soon'}
                {locale === 'vi' && 'Sắp có trailer'}
                {locale === 'th' && 'ตัวอย่างเร็วๆ นี้'}
              </p>
            </div>
          </div>
        </section>

        {/* Editorial comment — "30秒追剧指南" */}
        <section className="py-6">
          <EditorialComment
            text={synopsis.slice(0, 250)}
            author={locale === 'en' ? 'CDramaDB Editors' : locale === 'vi' ? 'Biên tập CDramaDB' : 'บรรณาธิการ CDramaDB'}
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
            {synopsis}
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
                <span className="text-ink-5 text-xl">👤</span>
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
            title={title}
            shareLabel={t('common.share')}
          />
        </section>

        {/* Spacer for footer */}
        <div className="h-12" />
      </div>
    </>
  );
}
