export const dynamic = 'force-dynamic';
import { getTranslations, getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { actors, dramas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  getLocalizedText,
  parseJsonArray,
  tmdbImage,
} from '@/lib/utils/helpers';
import DramaCard from '@/components/DramaCard';
import type { Metadata } from 'next';

// ────────────────────────────────────────
// Metadata
// ────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const { locale, slug } = params;
  const actor = await db.select().from(actors).where(eq(actors.slug, slug)).get();

  if (!actor) return { title: 'Actor Not Found' };

  const name = getLocalizedText(actor.namesJson, locale, actor.name);
  const bio = getLocalizedText(actor.bioJson, locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    description: bio.slice(0, 200),
    image: actor.photoUrl || undefined,
  };

  return {
    title: `${name} — CDramaDB`,
    description: bio.slice(0, 160),
    other: {
      'application/ld+json': JSON.stringify(jsonLd),
    },
  };
}

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default async function ActorDetailPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const t = await getTranslations();
  const { locale, slug } = params;

  const actor = await db.select().from(actors).where(eq(actors.slug, slug)).get();
  if (!actor) notFound();

  const name = getLocalizedText(actor.namesJson, locale, actor.name);
  const bio = getLocalizedText(actor.bioJson, locale);
  const dramaSlugs = parseJsonArray<string>(actor.dramasJson);
  const collaborations = parseJsonArray<{ name: string; slug: string; count: number }>(actor.collaborationsJson);

  // Resolve dramas
  const actorDramas: any[] = [];
  for (const dramaSlug of dramaSlugs.slice(0, 12)) {
    try {
      const drama = await db.select().from(dramas).where(eq(dramas.slug, dramaSlug.trim())).get();
      if (drama) {
        actorDramas.push({
          slug: drama.slug,
          title: getLocalizedText(drama.titlesJson, locale, drama.originalTitle),
          posterUrl: tmdbImage(drama.posterUrl, 'w342'),
          year: drama.year,
          moods: parseJsonArray<string>(drama.moodTags),
        });
      }
    } catch {
      continue;
    }
  }

  // Person JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    description: bio.slice(0, 200),
    image: actor.photoUrl || undefined,
    url: `https://cdramadb.com/${locale}/actor/${slug}`,
    knownFor: actorDramas.map((d) => ({
      '@type': 'TVSeries',
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
        {/* Hero — Avatar + Name + Bio */}
        <section className="flex flex-col md:flex-row items-start gap-8 mb-16">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-40 h-40 md:w-52 md:h-52 rounded-song overflow-hidden border-2 border-ivory-border">
              {actor.photoUrl ? (
                <img
                  src={actor.photoUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-dingyao flex items-center justify-center">
                  <span className="text-ink-5 text-5xl">👤</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-1 mb-3 tracking-wider">
              {name}
            </h1>
            {bio && (
              <p className="text-base text-ink-3 leading-relaxed max-w-2xl mb-4">
                {bio}
              </p>
            )}
            <p className="text-sm text-ink-4">
              {actorDramas.length} {locale === 'en' ? 'dramas' : locale === 'vi' ? 'phim' : 'ซีรีส์'}
            </p>
          </div>
        </section>

        <div className="crackle-divider mb-12" />

        {/* Filmography */}
        <section className="mb-16">
          <h2 className="font-display text-2xl font-semibold text-ink-1 mb-8 tracking-wider">
            {locale === 'en' ? 'Filmography' : locale === 'vi' ? 'Danh sách phim' : 'ผลงาน'}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {actorDramas.map((drama) => (
              <DramaCard
                key={drama.slug}
                slug={drama.slug}
                title={drama.title}
                posterUrl={drama.posterUrl}
                moods={drama.moods.slice(0, 2)}
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
            ))}
          </div>

          {actorDramas.length === 0 && (
            <p className="text-ink-4 text-sm">
              {locale === 'en' ? 'No dramas found for this actor yet.' : locale === 'vi' ? 'Chưa có phim nào cho diễn viên này.' : 'ยังไม่พบซีรีส์สำหรับนักแสดงคนนี้'}
            </p>
          )}
        </section>

        <div className="crackle-divider mb-12" />

        {/* Collaboration Network */}
        {collaborations.length > 0 && (
          <section className="mb-16">
            <h2 className="font-display text-2xl font-semibold text-ink-1 mb-8 tracking-wider">
              {locale === 'en' ? 'Frequent Collaborators' : locale === 'vi' ? 'Bạn diễn thường xuyên' : 'นักแสดงที่ร่วมงานบ่อย'}
            </h2>

            <div className="flex flex-wrap gap-3">
              {collaborations.map((collab) => (
                <div
                  key={collab.slug}
                  className="song-card px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-dingyao border border-ivory-border flex items-center justify-center">
                    <span className="text-ink-5 text-sm">👤</span>
                  </div>
                  <div>
                    <p className="text-sm text-ink-2 font-medium">{collab.name}</p>
                    <p className="text-xs text-ink-4">
                      {collab.count} {locale === 'en' ? 'projects together' : locale === 'vi' ? 'dự án chung' : 'โปรเจกต์ร่วมกัน'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="h-8" />
      </div>
    </>
  );
}
