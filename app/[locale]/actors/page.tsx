export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { actors } from '@/lib/db/schema';

import { getLocalizedText } from '@/lib/utils/helpers';
import ActorGrid from './ActorGrid';

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
    en: 'Chinese Drama Actors — Filmography, Photos & Where to Watch',
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

  // Fetch all actors sorted by drama count (most prolific first)
  const allActors = await db
    .select()
    .from(actors)
    .orderBy(desc(actors.dramasJson))
    .all();

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

  // i18n labels
  const labels = {
    title: locale === 'vi' ? 'Diễn viên Hoa Ngữ' : locale === 'th' ? 'นักแสดงซีรีส์จีน' : locale === 'id' ? 'Aktor Drama Cina' : 'Chinese Drama Actors',
    subtitle: locale === 'vi' ? `${actorData.length} diễn viên` : locale === 'th' ? `${actorData.length} คน` : locale === 'id' ? `${actorData.length} aktor` : `${actorData.length} actors`,
    searchPlaceholder: locale === 'vi' ? 'Tìm theo tên...' : locale === 'th' ? 'ค้นหาตามชื่อ...' : locale === 'id' ? 'Cari berdasarkan nama...' : 'Search by name...',
    dramas: locale === 'vi' ? 'phim' : locale === 'th' ? 'ซีรีส์' : locale === 'id' ? 'drama' : 'dramas',
    born: locale === 'vi' ? 'Sinh' : locale === 'th' ? 'เกิด' : locale === 'id' ? 'Lahir' : 'Born',
    noResults: locale === 'vi' ? 'Không tìm thấy diễn viên nào.' : locale === 'th' ? 'ไม่พบนักแสดง' : locale === 'id' ? 'Tidak ada aktor ditemukan.' : 'No actors found.',
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-1 tracking-wider mb-2">
          {labels.title}
        </h1>
        <p className="text-ink-4 text-sm">{labels.subtitle}</p>
      </div>

      {/* Actor Grid (client component for search/filter) */}
      <ActorGrid
        actors={actorData}
        locale={locale}
        labels={labels}
      />
    </div>
  );
}
