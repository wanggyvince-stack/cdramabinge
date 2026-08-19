export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import Link from 'next/link';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import {
  getLocalizedText,
  tmdbImage,
} from '@/lib/utils/helpers';

// ────────────────────────────────────────
// Category definitions
// ────────────────────────────────────────

interface CategoryDef {
  id: string;
  type: 'mood' | 'short' | 'top_rated';
  moodTag?: string;
  enLabel: string;
  viLabel: string;
  thLabel: string;
  idLabel: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: 'romantic',
    type: 'mood',
    moodTag: 'romantic',
    enLabel: '"I want to fall in love"',
    viLabel: '"Tôi muốn yêu"',
    thLabel: '"อยากมีความรัก"',
    idLabel: '"Ingin jatuh cinta"',
  },
  {
    id: 'wanna_cry',
    type: 'mood',
    moodTag: 'wanna_cry',
    enLabel: '"I want a good cry"',
    viLabel: '"Tôi muốn khóc"',
    thLabel: '"อยากร้องไห้"',
    idLabel: '"Ingin menangis"',
  },
  {
    id: 'intense',
    type: 'mood',
    moodTag: 'intense',
    enLabel: '"I need thrills"',
    viLabel: '"Tôi cần kịch tính"',
    thLabel: '"ต้องการความตื่นเต้น"',
    idLabel: '"Butuh sensasi"',
  },
  {
    id: 'light_fun',
    type: 'mood',
    moodTag: 'light_fun',
    enLabel: '"I want something light"',
    viLabel: '"Tôi muốn xem nhẹ nhàng"',
    thLabel: '"อยากดูเบาๆ"',
    idLabel: '"Ingin yang ringan"',
  },
  {
    id: 'empowering',
    type: 'mood',
    moodTag: 'empowering',
    enLabel: '"I want to be inspired"',
    viLabel: '"Tôi muốn được truyền cảm hứng"',
    thLabel: '"อยากได้แรงบันดาลใจ"',
    idLabel: '"Ingin terinspirasi"',
  },
  {
    id: 'mindbending',
    type: 'mood',
    moodTag: 'mindbending',
    enLabel: '"I want my mind blown"',
    viLabel: '"Tôi muốn bất ngờ"',
    thLabel: '"อยากทึ่ง"',
    idLabel: '"Ingin terpukau"',
  },
  {
    id: 'spooky',
    type: 'mood',
    moodTag: 'spooky',
    enLabel: '"I want to be scared"',
    viLabel: '"Tôi muốn sợ"',
    thLabel: '"อยากกลัว"',
    idLabel: '"Ingin takut"',
  },
  {
    id: 'aesthetic',
    type: 'mood',
    moodTag: 'aesthetic',
    enLabel: '"I want beauty"',
    viLabel: '"Tôi muốn đẹp"',
    thLabel: '"อยากเห็นความงาม"',
    idLabel: '"Ingin keindahan"',
  },
  {
    id: 'short',
    type: 'short',
    enLabel: '"I only have one weekend"',
    viLabel: '"Tôi chỉ có cuối tuần"',
    thLabel: '"มีแค่สุดสัปดาห์"',
    idLabel: '"Cuma punya akhir pekan"',
  },
  {
    id: 'top_rated',
    type: 'top_rated',
    enLabel: '"The all-time best"',
    viLabel: '"Hay nhất mọi thời đại"',
    thLabel: '"ดีที่สุดตลอดกาล"',
    idLabel: '"Terbaik sepanjang masa"',
  },
];

// ────────────────────────────────────────
// Data fetching
// ────────────────────────────────────────

async function loadCategory(cat: CategoryDef, locale: string) {
  try {
    const allDramas = await db.select().from(dramas).all();
    let filtered: typeof allDramas;

    if (cat.type === 'mood' && cat.moodTag) {
      filtered = allDramas
        .filter((d) => {
          const tags: string[] = JSON.parse(d.moodTags || '[]');
          return tags.includes(cat.moodTag!);
        })
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (cat.type === 'short') {
      filtered = allDramas
        .filter((d) => d.episodes && d.episodes <= 20)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      // top_rated
      filtered = [...allDramas].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return filtered.slice(0, 3).map((d) => ({
      slug: d.slug,
      title: getLocalizedText(d.titlesJson, locale, d.originalTitle),
      posterUrl: d.posterUrl ? tmdbImage(d.posterUrl, 'w500') : null,
      year: d.year,
      rating: d.rating,
      episodes: d.episodes,
    }));
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
  params: { locale: string };
}): Promise<Metadata> {
  const { locale } = params;
  const canonicalUrl = `https://cdramabinge.com/${locale}/starter-pack`;

  return {
    title: 'CDrama Starter Pack — New to Chinese Dramas? Start Here',
    description:
      "Don't know which Chinese drama to watch first? Our mood-based starter pack picks the 3 best C-dramas for every vibe. No spoilers, just great recommendations.",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `https://cdramabinge.com/en/starter-pack`,
        vi: `https://cdramabinge.com/vi/starter-pack`,
        th: `https://cdramabinge.com/th/starter-pack`,
        id: `https://cdramabinge.com/id/starter-pack`,
        'x-default': `https://cdramabinge.com/en/starter-pack`,
      },
    },
    openGraph: {
      title: 'CDrama Starter Pack — New to Chinese Dramas? Start Here',
      description:
        "Don't know which Chinese drama to watch first? Our mood-based starter pack picks the 3 best C-dramas for every vibe.",
      url: canonicalUrl,
      type: 'website',
      siteName: 'CDramaBinge',
      images: [{ url: 'https://cdramabinge.com/api/og?type=home', width: 1200, height: 630, alt: 'CDramaBinge' }],
    },
  };
}

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default async function StarterPackPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = await getLocale();

  // Load all categories in parallel
  const categoryResults = await Promise.all(
    CATEGORIES.map(async (cat) => ({
      category: cat,
      dramas: await loadCategory(cat, locale),
    }))
  );

  // Filter out categories with no dramas
  const populatedCategories = categoryResults.filter((c) => c.dramas.length > 0);

  const displayTitle = locale === 'vi'
    ? 'Gói Khởi Đầu CDrama'
    : locale === 'th'
    ? 'ชุดเริ่มต้น CDrama'
    : locale === 'id'
    ? 'Paket Awal CDrama'
    : 'Your CDrama Starter Pack';

  const displaySubtitle = locale === 'vi'
    ? 'Không biết bắt đầu từ đâu? Chọn tâm trạng, chúng tôi sẽ chọn phim cho bạn.'
    : locale === 'th'
    ? 'ไม่รู้จะเริ่มต้นที่ไหน? เลือกอารมณ์ แล้วเราจะเลือกซีรีส์ให้คุณ'
    : locale === 'id'
    ? 'Tidak tahu mulai dari mana? Pilih suasana hati, kami pilihkan dramanya.'
    : "Don't know where to start? Pick a mood, and we'll give you 3 dramas to binge.";

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'CDrama Starter Pack',
    description: 'Mood-based starter recommendations for new C-drama viewers',
    numberOfItems: populatedCategories.reduce((acc, c) => acc + c.dramas.length, 0),
    itemListElement: populatedCategories.flatMap((c, catIdx) =>
      c.dramas.map((drama, dramaIdx) => ({
        '@type': 'ListItem',
        position: catIdx * 3 + dramaIdx + 1,
        name: drama.title,
        url: `https://cdramabinge.com/${locale}/drama/${drama.slug}`,
      }))
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <header className="text-center mb-16">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-ink-1 tracking-wider mb-4">
            {displayTitle}
          </h1>
          <p className="text-base md:text-lg text-ink-3 max-w-2xl mx-auto leading-relaxed">
            {displaySubtitle}
          </p>
        </header>

        {/* Categories */}
        <div className="space-y-12">
          {populatedCategories.map(({ category, dramas }, idx) => {
            const label = locale === 'vi'
              ? category.viLabel
              : locale === 'th'
              ? category.thLabel
              : locale === 'id'
              ? category.idLabel
              : category.enLabel;

            return (
              <section
                key={category.id}
                className={idx % 2 === 0 ? '' : 'bg-dingyao/30 rounded-xl p-6 md:p-8'}
              >
                {idx % 2 !== 0 && (
                  <h2 className="font-display text-xl md:text-2xl font-semibold text-ink-1 mb-6 tracking-wide">
                    {label}
                  </h2>
                )}
                {idx % 2 === 0 && (
                  <h2 className="font-display text-xl md:text-2xl font-semibold text-ink-1 mb-6 tracking-wide">
                    {label}
                  </h2>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {dramas.map((drama) => (
                    <Link
                      key={drama.slug}
                      href={`/${locale}/drama/${drama.slug}`}
                      className="group block"
                    >
                      <div className="aspect-[2/3] rounded-song overflow-hidden bg-dingyao border border-ivory-border mb-3">
                        {drama.posterUrl ? (
                          <img
                            src={drama.posterUrl}
                            alt={drama.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-3xl font-display text-ink-5">剧</span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-display text-sm font-semibold text-ink-1 group-hover:text-ruyao transition-colors duration-song line-clamp-2">
                        {drama.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-ink-4 mt-1">
                        {drama.year && <span>{drama.year}</span>}
                        {drama.rating && <span>★ {drama.rating.toFixed(1)}</span>}
                        {category.type === 'short' && drama.episodes && (
                          <span>{drama.episodes}ep</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {populatedCategories.length === 0 && (
          <div className="text-center py-20">
            <p className="text-ink-4 text-lg">
              Coming soon — we're curating the perfect starter pack for you.
            </p>
          </div>
        )}

        <div className="h-12" />
      </div>
    </>
  );
}
