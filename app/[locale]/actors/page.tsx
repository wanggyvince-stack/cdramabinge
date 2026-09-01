export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { actors } from '@/lib/db/schema';
import { getLocalizedText } from '@/lib/utils/helpers';
import { getTranslations } from 'next-intl/server';
import ActorsClient from './ActorsClient';

// ────────────────────────────────────────
// Metadata
// ────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const canonicalUrl = `https://cdramabinge.com/${locale}/actors`;

  const titles: Record<string, string> = {
    en: 'Chinese Drama Actors — Filmography & Where to Watch',
    vi: 'Diễn viên Hoa Ngữ — Danh sách phim, Ảnh & Xem ở đâu',
    th: 'นักแสดงซีรีส์จีน — ผลงาน, รูปภาพ & ดูที่ไหน',
    id: 'Aktor Drama Cina — Filmografi, Foto & Tonton di mana',
  };

  const descriptions: Record<string, string> = {
    en: 'Browse 396 Chinese drama actors. Explore filmography, character roles, photos, birthday, and find where to watch their dramas online.',
    vi: 'Duyệt 396 diễn viên phim Hoa Ngữ. Khám phá danh sách phim, vai diễn, ảnh, ngày sinh và tìm xem phim của họ trực tuyến.',
    th: 'เรียกดูนักแสดงซีรีส์จีน 396 คน สำรวจผลงาน บท ภาพยนตร์ วันเกิด และดูซีรีส์ของพวกเขาทางออนไลน์',
    id: 'Jelajahi 396 aktor drama Cina. Telusuri filmografi, peran, foto, ulang tahun, dan temukan tempat menonton drama mereka online.',
  };

  return {
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `https://cdramabinge.com/en/actors`,
        vi: `https://cdramabinge.com/vi/actors`,
        th: `https://cdramabinge.com/th/actors`,
        id: `https://cdramabinge.com/id/actors`,
        'x-default': `https://cdramabinge.com/en/actors`,
      },
    },
    openGraph: {
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      url: canonicalUrl,
      type: 'website',
      siteName: 'CDramaBinge',
    },
  };
}

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default async function ActorsPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const t = await getTranslations('actors');
  const tp = await getTranslations('pagination');

  // Fetch all actors
  const allActors = await db.select().from(actors).all();

  // Build actor data for the client grid
  const actorData = allActors
    .map((actor) => {
      const name = getLocalizedText(actor.namesJson, locale, actor.name);
      let zhName = '';
      try {
        const names = typeof actor.namesJson === 'string' ? JSON.parse(actor.namesJson) : actor.namesJson;
        zhName = names?.zh || '';
      } catch {}

      let dramaCount = 0;
      try {
        const d = JSON.parse(actor.dramasJson || '[]');
        dramaCount = Array.isArray(d) ? d.length : 0;
      } catch {}

      return {
        slug: actor.slug,
        name,
        zhName,
        photoUrl: actor.photoUrl || '',
        dramaCount,
        birthday: actor.birthday || '',
        birthplace: actor.birthplace || '',
      };
    })
    // Sort: actors with more dramas first, then alphabetically
    .sort((a, b) => {
      if (b.dramaCount !== a.dramaCount) return b.dramaCount - a.dramaCount;
      return a.name.localeCompare(b.name);
    });

  // Labels from i18n
  const labels = {
    title: t('title'),
    subtitle: t('subtitle', { count: actorData.length }),
    searchPlaceholder: t('searchPlaceholder'),
    dramas: t('dramas'),
    born: t('born'),
    noResults: t('noResults'),
    previous: tp('previous'),
    next: tp('next'),
    page: tp('page'),
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <ActorsClient
        actors={actorData}
        locale={locale}
        labels={labels}
      />
    </div>
  );
}
