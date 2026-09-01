export const dynamic = 'force-dynamic';
import { getTranslations } from 'next-intl/server';
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
import Link from 'next/link';
import type { Metadata } from 'next';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface FilmographyEntry {
  id: number;
  name: string;
  character: string;
  episode_count: number;
  first_air_date: string;
  vote_average: number;
  poster_path: string;
  is_in_our_db: boolean;
  our_slug: string;
}

// ────────────────────────────────────────
// Metadata (P2 SEO)
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

  // Extract Chinese name for alternateName
  let zhName = '';
  try {
    const names = typeof actor.namesJson === 'string' ? JSON.parse(actor.namesJson) : actor.namesJson;
    zhName = names?.zh || '';
  } catch {}

  const alsoKnownAs = parseJsonArray<string>(actor.alsoKnownAs);
  const alternateNames = [name, zhName, ...alsoKnownAs].filter(Boolean);

  // Build description
  const birthYear = actor.birthday ? new Date(actor.birthday).getFullYear() : '';
  const topDramas = parseJsonArray<FilmographyEntry>(actor.fullFilmographyJson)
    .filter(f => f.is_in_our_db)
    .slice(0, 3)
    .map(f => f.name);

  let descriptionText: string;
  if (actor.birthday && actor.birthplace) {
    descriptionText = `${name} (${zhName}) is a Chinese actor born on ${actor.birthday} in ${actor.birthplace}.${topDramas.length > 0 ? ` Known for: ${topDramas.join(', ')}.` : ''} Explore full filmography, roles, and where to watch on CDramaBinge.`;
  } else {
    descriptionText = bio || `All Chinese dramas starring ${name}. Watch list, roles, filmography and where to watch on CDramaBinge.`;
  }

  // Title format
  const titleText = `${name} - Chinese Actor, Filmography & Dramas`;

  // JSON-LD Person schema
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    alternateName: alternateNames.length > 1 ? alternateNames : undefined,
    description: descriptionText.slice(0, 200),
    image: actor.photoUrl || undefined,
    url: `https://cdramabinge.com/${locale}/actor/${slug}`,
    birthDate: actor.birthday || undefined,
    birthPlace: actor.birthplace || undefined,
    gender: actor.gender === 1 ? 'Female' : actor.gender === 2 ? 'Male' : undefined,
    nationality: 'Chinese',
    knowsAbout: actor.knownForDepartment || 'Acting',
  };

  // sameAs — link to TMDB
  if (actor.tmdbPersonId) {
    jsonLd.sameAs = `https://www.themoviedb.org/person/${actor.tmdbPersonId}`;
  }

  // knownFor — with role
  const knownDramas = parseJsonArray<FilmographyEntry>(actor.fullFilmographyJson)
    .filter(f => f.is_in_our_db)
    .slice(0, 5);
  if (knownDramas.length > 0) {
    jsonLd.knownFor = knownDramas.map(d => ({
      '@type': 'TVSeries',
      name: d.name,
      url: `https://cdramabinge.com/${locale}/drama/${d.our_slug}`,
      actor: {
        '@type': 'Person',
        name,
        role: d.character || 'Actor',
      },
    }));
  }

  // BreadcrumbList JSON-LD
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `https://cdramabinge.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Actors', item: `https://cdramabinge.com/${locale}/actors` },
      { '@type': 'ListItem', position: 3, name, item: `https://cdramabinge.com/${locale}/actor/${slug}` },
    ],
  };

  const canonicalUrl = `https://cdramabinge.com/${locale}/actor/${slug}`;

  return {
    title: titleText,
    description: descriptionText.slice(0, 160),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `https://cdramabinge.com/en/actor/${slug}`,
        vi: `https://cdramabinge.com/vi/actor/${slug}`,
        th: `https://cdramabinge.com/th/actor/${slug}`,
        id: `https://cdramabinge.com/id/actor/${slug}`,
        'x-default': `https://cdramabinge.com/en/actor/${slug}`,
      },
    },
    openGraph: {
      title: titleText,
      description: descriptionText.slice(0, 160),
      url: canonicalUrl,
      type: 'profile',
      images: actor.photoUrl ? [{ url: actor.photoUrl }] : [],
    },
    other: {
      'application/ld+json': JSON.stringify([jsonLd, breadcrumbJsonLd]),
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

  // Chinese name
  let zhName = '';
  try {
    const names = typeof actor.namesJson === 'string' ? JSON.parse(actor.namesJson) : actor.namesJson;
    zhName = names?.zh || '';
  } catch {}

  // Also known as
  const alsoKnownAs = parseJsonArray<string>(actor.alsoKnownAs);

  // Photos
  const photos = parseJsonArray<string>(actor.photosJson);

  // Full filmography
  const fullFilmography = parseJsonArray<FilmographyEntry>(actor.fullFilmographyJson);

  // Sort filmography by first_air_date descending
  const sortedFilmography = [...fullFilmography].sort((a, b) => {
    const dateA = a.first_air_date || '';
    const dateB = b.first_air_date || '';
    return dateB.localeCompare(dateA);
  });

  // Dramas in our database (for "Our Collection" section)
  const dramaEntries = parseJsonArray<{ slug: string; character: string }>(actor.dramasJson);
  const collaborations = parseJsonArray<{ name: string; slug: string; count: number }>(actor.collaborationsJson);

  const actorDramas: any[] = [];
  for (const entry of dramaEntries.slice(0, 12)) {
    try {
      const dramaSlug = typeof entry === 'string' ? entry : entry.slug;
      const character = typeof entry === 'string' ? '' : entry.character;
      const drama = await db.select().from(dramas).where(eq(dramas.slug, dramaSlug.trim())).get();
      if (drama) {
        actorDramas.push({
          slug: drama.slug,
          title: getLocalizedText(drama.titlesJson, locale, drama.originalTitle),
          posterUrl: tmdbImage(drama.posterUrl, 'w500'),
          year: drama.year,
          moods: parseJsonArray<string>(drama.moodTags),
          character,
        });
      }
    } catch {
      continue;
    }
  }

  // Format birthday for display
  const formatBirthday = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // i18n labels
  const labels = {
    alsoKnownAs: locale === 'vi' ? 'Còn được biết đến' : locale === 'th' ? 'รู้จักในชื่อ' : locale === 'id' ? 'Dikenal juga sebagai' : 'Also known as',
    born: locale === 'vi' ? 'Sinh' : locale === 'th' ? 'เกิด' : locale === 'id' ? 'Lahir' : 'Born',
    filmography: locale === 'vi' ? 'Danh sách phim' : locale === 'th' ? 'ผลงาน' : locale === 'id' ? 'Filmografi' : 'Filmography',
    ourCollection: locale === 'vi' ? 'Bộ sưu tập' : locale === 'th' ? 'คอลเลกชัน' : locale === 'id' ? 'Koleksi Kami' : 'Our Collection',
    collaborators: locale === 'vi' ? 'Bạn diễn thường xuyên' : locale === 'th' ? 'นักแสดงที่ร่วมงานบ่อย' : locale === 'id' ? 'Kolaborator Tetap' : 'Frequent Collaborators',
    year: locale === 'vi' ? 'Năm' : locale === 'th' ? 'ปี' : locale === 'id' ? 'Tahun' : 'Year',
    title: locale === 'vi' ? 'Tên phim' : locale === 'th' ? 'ชื่อเรื่อง' : locale === 'id' ? 'Judul' : 'Title',
    role: locale === 'vi' ? 'Vai' : locale === 'th' ? 'บทบาท' : locale === 'id' ? 'Peran' : 'Role',
    episodes: locale === 'vi' ? 'Tập' : locale === 'th' ? 'ตอน' : locale === 'id' ? 'Episode' : 'Episodes',
    rating: locale === 'vi' ? 'Đánh giá' : locale === 'th' ? 'คะแนน' : locale === 'id' ? 'Rating' : 'Rating',
    projectsTogether: locale === 'vi' ? 'dự án chung' : locale === 'th' ? 'โปรเจกต์ร่วมกัน' : locale === 'id' ? 'proyek bersama' : 'projects together',
    noDramas: locale === 'vi' ? 'Chưa có phim nào cho diễn viên này.' : locale === 'th' ? 'ยังไม่พบซีรีส์สำหรับนักแสดงคนนี้' : locale === 'id' ? 'Belum ada drama untuk aktor ini.' : 'No dramas found for this actor yet.',
    alsoStarredIn: locale === 'vi' ? 'Cũng xuất hiện trong các phim này trên CDramaBinge' : locale === 'th' ? 'ยังแสดงในซีรีส์เหล่านี้บน CDramaBinge' : locale === 'id' ? 'Juga membintangi drama ini di CDramaBinge' : 'Also starred in these dramas on CDramaBinge',
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-ink-4">
            <li>
              <Link href={`/${locale}`} className="hover:text-ruyao transition-colors duration-song">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-ink-5">/</li>
            <li>
              <Link href={`/${locale}/actors`} className="hover:text-ruyao transition-colors duration-song">
                Actors
              </Link>
            </li>
            <li aria-hidden="true" className="text-ink-5">/</li>
            <li aria-current="page" className="text-ink-2 font-medium truncate max-w-[200px]">
              {name}
            </li>
          </ol>
        </nav>

        {/* ── Hero: Avatar + Name + Bio + Personal Info ── */}
        <section className="flex flex-col md:flex-row items-start gap-8 mb-12">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden border-2 shadow-lg" style={{ borderColor: '#d4a853' }}>
              {actor.photoUrl ? (
                <img
                  src={actor.photoUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                    width={200}
                    height={300}
                />
              ) : (
                <div className="w-full h-full bg-dingyao flex items-center justify-center">
                  <svg className="w-12 h-12 text-ink-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-1 mb-1 tracking-wider">
              {name}
            </h1>

            {/* Chinese name */}
            {zhName && zhName !== name && (
              <p className="text-lg text-ink-3 mb-2">{zhName}</p>
            )}

            {/* Also known as */}
            {alsoKnownAs.length > 0 && (
              <p className="text-sm text-ink-4 mb-2">
                {labels.alsoKnownAs}: {alsoKnownAs.join(', ')}
              </p>
            )}

            {/* Birthday + Birthplace */}
            {(actor.birthday || actor.birthplace) && (
              <p className="text-sm text-ink-4 mb-3">
                {actor.birthday && `${labels.born}: ${formatBirthday(actor.birthday)}`}
                {actor.birthday && actor.birthplace && ` · `}
                {actor.birthplace}
              </p>
            )}

            {/* Bio */}
            {bio && (
              <p className="text-base text-ink-3 leading-relaxed max-w-3xl mb-4">
                {bio}
              </p>
            )}

            {/* Drama count */}
            <p className="text-sm text-ink-4">
              {actorDramas.length} {locale === 'en' ? 'dramas' : locale === 'vi' ? 'phim' : locale === 'id' ? 'drama' : 'ซีรีส์'}
              {collaborations.length > 0 && ` · ${collaborations.length} ${locale === 'en' ? 'collaborations' : locale === 'vi' ? 'bạn diễn' : locale === 'id' ? 'kolaborasi' : 'นักแสดงร่วม'}`}
            </p>
          </div>
        </section>

        {/* ── Photo Gallery ── */}
        {photos.length > 1 && (
          <>
            <section className="mb-12">
              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin">
                {photos.map((photoUrl, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 rounded-lg overflow-hidden shadow-md"
                    style={{ width: idx === 0 ? 260 : 180, height: idx === 0 ? 360 : 250 }}
                  >
                    <img
                      src={photoUrl.replace('/w300', idx === 0 ? '/w780' : '/w300')}
                      alt={`${name} - photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading={idx < 2 ? 'eager' : 'lazy'}
                    width={200}
                    height={300}
                    />
                  </div>
                ))}
              </div>
            </section>
            <div className="crackle-divider mb-12" />
          </>
        )}

        {/* ── Full Filmography Table ── */}
        {sortedFilmography.length > 0 && (
          <>
            <section className="mb-16">
              <h2 className="font-display text-2xl font-semibold text-ink-1 mb-8 tracking-wider">
                {labels.filmography}
                <span className="text-ink-4 text-lg ml-2 font-normal">({sortedFilmography.length})</span>
              </h2>

              {/* Desktop: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ivory-border text-ink-4 font-display">
                      <th className="text-left py-3 px-2 w-16">{labels.year}</th>
                      <th className="text-left py-3 px-2 w-12"></th>
                      <th className="text-left py-3 px-2">{labels.title}</th>
                      <th className="text-left py-3 px-2">{labels.role}</th>
                      <th className="text-right py-3 px-2 w-20">{labels.episodes}</th>
                      <th className="text-right py-3 px-2 w-16">{labels.rating}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFilmography.map((item, idx) => {
                      const year = item.first_air_date ? item.first_air_date.slice(0, 4) : '';
                      const posterThumb = item.poster_path
                        ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
                        : '';

                      return (
                        <tr key={`${item.id}-${idx}`} className="border-b border-ivory-border/50 hover:bg-ivory-dark/30 transition-colors duration-song">
                          <td className="py-2.5 px-2 text-ink-4">{year}</td>
                          <td className="py-2.5 px-2">
                            {posterThumb && (
                              <img
                                src={posterThumb}
                                alt={`${item.name} poster`}
                                className="w-8 h-12 rounded object-cover"
                                loading="lazy"
                    width={400}
                    height={600}
                              />
                            )}
                          </td>
                          <td className="py-2.5 px-2">
                            {item.is_in_our_db && item.our_slug ? (
                              <Link
                                href={`/${locale}/drama/${item.our_slug}`}
                                className="text-ink-1 hover:text-ruyao transition-colors duration-song font-medium"
                              >
                                {item.name}
                              </Link>
                            ) : (
                              <span className="text-ink-4">{item.name}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-ink-3">{item.character}</td>
                          <td className="py-2.5 px-2 text-right text-ink-4">
                            {item.episode_count > 0 ? item.episode_count : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            {item.vote_average > 0 ? (
                              <span className="text-ink-2 font-medium">{item.vote_average.toFixed(1)}</span>
                            ) : (
                              <span className="text-ink-5">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Card list */}
              <div className="md:hidden space-y-3">
                {sortedFilmography.map((item, idx) => {
                  const year = item.first_air_date ? item.first_air_date.slice(0, 4) : '';
                  const posterThumb = item.poster_path
                    ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
                    : '';

                  return (
                    <div key={`m-${item.id}-${idx}`} className="flex gap-3 p-3 rounded-lg bg-ivory-dark/40">
                      {posterThumb && (
                        <img
                          src={posterThumb}
                          alt={`${item.name} poster`}
                          className="w-14 h-20 rounded object-cover flex-shrink-0"
                          width={400}
                          height={600}
                          loading="lazy"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-ink-4">{year}</p>
                        {item.is_in_our_db && item.our_slug ? (
                          <Link
                            href={`/${locale}/drama/${item.our_slug}`}
                            className="text-sm text-ink-1 hover:text-ruyao transition-colors duration-song font-medium block truncate"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          <p className="text-sm text-ink-4 truncate">{item.name}</p>
                        )}
                        {item.character && (
                          <p className="text-xs text-ink-4 truncate">{item.character}</p>
                        )}
                        {item.vote_average > 0 && (
                          <p className="text-xs text-ink-3 mt-0.5">{item.vote_average.toFixed(1)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            <div className="crackle-divider mb-12" />
          </>
        )}

        {/* ── Our Collection (dramas in our DB with mood tags) ── */}
        {actorDramas.length > 0 && (
          <>
            <section className="mb-16">
              <h2 className="font-display text-2xl font-semibold text-ink-1 mb-8 tracking-wider">
                {labels.ourCollection}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                {actorDramas.map((drama) => (
                  <div key={drama.slug}>
                    <DramaCard
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
                    {drama.character && (
                      <p className="text-xs text-ink-4 mt-1 truncate px-1">{drama.character}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <div className="crackle-divider mb-12" />
          </>
        )}

        {/* ── No dramas fallback ── */}
        {actorDramas.length === 0 && sortedFilmography.length === 0 && (
          <p className="text-ink-4 text-sm mb-12">{labels.noDramas}</p>
        )}

        {/* ── Also Starred In (text-link internal link block) ── */}
        {dramaEntries.length > 1 && (
          <section className="mb-16">
            <h2 className="font-display text-xl font-semibold text-ink-1 mb-4 tracking-wider">
              {labels.alsoStarredIn}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {dramaEntries.map((entry) => {
                const dramaSlug = typeof entry === 'string' ? entry : entry.slug;
                const character = typeof entry === 'string' ? '' : entry.character;
                const drama = actorDramas.find(d => d.slug === dramaSlug);
                if (!drama) return null;
                return (
                  <Link
                    key={dramaSlug}
                    href={`/${locale}/drama/${dramaSlug}`}
                    className="text-sm text-ruyao hover:underline transition-colors duration-song"
                  >
                    {drama.title}
                    {character && <span className="text-ink-4"> ({character})</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Frequent Collaborators ── */}
        {collaborations.length > 0 && (
          <section className="mb-16">
            <h2 className="font-display text-2xl font-semibold text-ink-1 mb-8 tracking-wider">
              {labels.collaborators}
            </h2>

            <div className="flex flex-wrap gap-3">
              {collaborations.map((collab) => (
                <Link
                  key={collab.slug}
                  href={`/${locale}/actor/${collab.slug}`}
                  className="song-card px-4 py-3 flex items-center gap-3 hover:bg-ivory-dark/60 transition-colors duration-song"
                >
                  <div className="w-10 h-10 rounded-full bg-dingyao border border-ivory-border flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-ink-2 font-medium">{collab.name}</p>
                    <p className="text-xs text-ink-4">
                      {collab.count} {labels.projectsTogether}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="h-8" />
      </div>
    </>
  );
}
