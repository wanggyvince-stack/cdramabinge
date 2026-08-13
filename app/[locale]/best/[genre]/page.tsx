import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
// drizzle-orm used for DB queries
import {
  getLocalizedText,
  parseJsonArray,
  MOOD_EMOJI,
  MOOD_GRADIENT_CLASS,
  ALL_MOODS,
  ALL_GENRES,
  tmdbImage,
} from '@/lib/utils/helpers';
import DramaCard from '@/components/DramaCard';
import type { Metadata } from 'next';

// ────────────────────────────────────────
// Editorial intros for each genre/mood
// ────────────────────────────────────────

const EDITORIAL_INTROS: Record<string, Record<string, string>> = {
  romance: {
    en: 'From sweet campus love stories to epic historical romances — these are the C-dramas that make your heart flutter.',
    vi: 'Từ chuyện tình ngọt ngào trường lớp đến tình yêu cổ trang sử thi — những bộ phim khiến tim bạn rung động.',
    th: 'จากเรื่องรักหวานในรั้วมหาวิทยาลัยถึงรักพีเรียดมหากาพย์ — ซีรีส์ที่ทำให้ใจคุณเต้นแรง',
  },
  historical: {
    en: 'Palace intrigue, dynastic struggles, and the weight of history. These dramas bring ancient China to vivid life.',
    vi: 'Cung đấu, tranh giành vương triều và sức nặng lịch sử. Những bộ phim đưa Trung Hoa cổ đại sống động trở lại.',
    th: 'การเมืองในวัง การต่อสู้ของราชวงศ์ และน้ำหนักของประวัติศาสตร์ ซีรีส์เหล่านี้ทำให้จีนโบราณมีชีวิตชีวา',
  },
  fantasy: {
    en: 'Magical realms, mythical creatures, and stories that transcend reality. Dive into the fantastical world of C-drama.',
    vi: 'Thế giới phép thuật, sinh vật thần thoại và những câu chuyện vượt thực tại.',
    th: 'อาณาจักรเวทมนตร์ สัตว์ในตำนาน และเรื่องราวที่เกินจริง ดื่มด่ำกับโลกแฟนตาซีของซีรีส์จีน',
  },
  wuxia: {
    en: 'Swords, honor, and the jianghu. These martial arts dramas capture the poetic spirit of ancient heroes.',
    vi: 'Kiếm, danh dự và giang hồ. Những bộ phim võ hiệp nắm bắt tinh thần thơ mộng của các anh hùng cổ đại.',
    th: 'ดาบ เกียรติยศ และยุทธภพ ซีรีส์กำลังภายในเหล่านี้จับจิตวิญญาณกวีของวีรบุรุษโบราณ',
  },
  xianxia: {
    en: 'Immortals, demons, and the pursuit of the Dao. Xianxia is C-drama\'s most visually spectacular genre.',
    vi: 'Tiên, ma và con đường tu đạo. Tiên hiệp là thể loại hoành tráng nhất của phim Hoa.',
    th: 'อมตะ ปีศาจ และการแสวงหาเต๋า เซียนเป็นแนวที่โดดเด่นที่สุดของซีรีส์จีน',
  },
  modern: {
    en: 'Contemporary China on screen — from urban romance to workplace drama and family stories.',
    vi: 'Trung Quốc đương đại trên màn ảnh — từ tình yêu đô thị đến chính kịch công sở và gia đình.',
    th: 'จีนร่วมสมัยบนหน้าจอ — จากความรักในเมืองถึงดราม่าที่ทำงานและเรื่องราวครอบครัว',
  },
  thriller: {
    en: 'Edge-of-your-seat suspense, psychological mind games, and jaw-dropping twists.',
    vi: 'Hồi hộp nghẹt thở, trò chơi tâm lý và những cú twist không tưởng.',
    th: 'ระทึกขวัญ เกมจิตวิทยา และพล็อตพลิกไม่คาดคิด',
  },
  comedy: {
    en: 'Laughter is the best medicine. These C-dramas will lift your spirits and make you smile.',
    vi: 'Tiếng cười là liều thuốc tốt nhất. Những bộ phim này sẽ nâng tinh thần và khiến bạn mỉm cười.',
    th: 'เสียงหัวเราะคือยาที่ดีที่สุด ซีรีส์จีนเหล่านี้จะทำให้คุณยิ้ม',
  },
  drama: {
    en: 'Powerful storytelling that explores the depths of human emotion and relationships.',
    vi: 'Câu chuyện mạnh mẽ khám phá chiều sâu cảm xúc và mối quan hệ con người.',
    th: 'การเล่าเรื่องที่ทรงพลังสำรวจความลึกของอารมณ์และความสัมพันธ์ของมนุษย์',
  },
  action: {
    en: 'High-octane stunts, explosive fights, and adrenaline-pumping excitement.',
    vi: 'Những pha hành động mạo hiểm, đánh nhau bùng nổ và sự phấn khích.',
    th: 'ฉากผาดโผน การต่อสู้ที่ระเบิด และความตื่นเต้น',
  },
  mystery: {
    en: 'Whodunits, cold cases, and puzzles that keep you guessing until the final reveal.',
    vi: 'Ai là thủ phạm, vụ án lạnh và những câu đố khiến bạn đoán đến phút cuối.',
    th: 'เรื่องลึกลับ คดีเย็น และปริศนาที่ทำให้คุณทายจนถึงตอนจบ',
  },
  sci_fi: {
    en: 'Future worlds, AI, space travel, and speculative fiction brought to life by Chinese creators.',
    vi: 'Thế giới tương lai, AI, du hành vũ trụ và khoa học viễn tưởng bởi các nhà sáng tạo Trung Quốc.',
    th: 'โลกอนาคต AI การเดินทางอวกาศ และนิยายวิทยาศาสตร์โดยผู้สร้างจีน',
  },
  // Mood-based intros
  wanna_cry: {
    en: 'Need a good cry? These emotionally devastating C-dramas will have you reaching for tissues.',
    vi: 'Cần khóc một trận? Những bộ phim này sẽ khiến bạn cần đến khăn giấy.',
    th: 'อยากร้องไห้? ซีรีส์จีนเหล่านี้จะทำให้คุณต้องใช้ทิชชู่',
  },
  light_fun: {
    en: 'Light, breezy, and endlessly rewatchable. Perfect for when you just want to feel good.',
    vi: 'Nhẹ nhàng, vui vẻ và có thể xem lại vô tận. Hoàn hảo khi bạn chỉ muốn thư giãn.',
    th: 'เบา สบาย และดูซ้ำได้ไม่เบื่อ เหมาะกับเวลาที่คุณอยากผ่อนคลาย',
  },
  intense: {
    en: 'High stakes, intense drama, and moments that will leave you breathless.',
    vi: 'Kịch tính cao, những khoảnh khắc khiến bạn nín thở.',
    th: 'เดิมพันสูง ดราม่าเข้มข้น และช่วงเวลาที่使你屏住呼吸',
  },
  romantic: {
    en: 'Swoon-worthy love stories — from first love butterflies to soulmate connections.',
    vi: 'Những câu chuyện tình yêu lãng mạn — từ tình yêu đầu đến tri kỷ.',
    th: 'เรื่องรักที่ชวนหลงใหล — จากความรักครั้งแรกถึงคู่แท้',
  },
  mindbending: {
    en: 'Complex plots, unreliable narrators, and endings that demand a rewatch.',
    vi: 'Cốt truyện phức tạp, người kể chuyện không đáng tin và kết thúc cần xem lại.',
    th: 'พล็อตซับซ้อน ผู้เล่าเรื่องที่ไม่น่าเชื่อถือ และตอนจบที่ต้องดูซ้ำ',
  },
  spooky: {
    en: 'Ghosts, demons, and supernatural thrills. These C-dramas will keep you up at night.',
    vi: 'Ma, quỷ và những pha kinh dị siêu nhiên. Những bộ phim này khiến bạn mất ngủ.',
    th: 'ผี ปีศาจ และความระทึกขวัญเหนือธรรมชาติ ซีรีส์จีนเหล่านี้จะทำให้คุณนอนไม่หลับ',
  },
  empowering: {
    en: 'Stories of resilience, triumph, and rising against all odds. Feel inspired.',
    vi: 'Câu chuyện về sự kiên cường, chiến thắng và vượt qua nghịch cảnh.',
    th: 'เรื่องราวของความมุ่งมั่น ชัยชนะ และการลุกขึ้นสู้กับทุกอุปสรรค',
  },
  aesthetic: {
    en: 'Visually stunning, beautifully composed. These dramas are a feast for the eyes.',
    vi: 'Đẹp tuyệt đối, bố cục hoàn hảo. Những bộ phim này là bữa tiệc cho thị giác.',
    th: 'สวยงามอย่างน่าทึ่ง องค์ประกอบสมบูรณ์แบบ ซีรีส์เหล่านี้เป็นอาหารตา',
  },
};

// ────────────────────────────────────────
// Params & Metadata
// ────────────────────────────────────────

export async function generateStaticParams() {
  const allParams = [...ALL_MOODS, ...ALL_GENRES].map((g) => ({ genre: g }));
  return allParams;
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; genre: string };
}): Promise<Metadata> {
  const { locale, genre } = params;
  const intro = EDITORIAL_INTROS[genre]?.[locale] || EDITORIAL_INTROS[genre]?.en || '';
  const title = genre.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `Best ${title} C-Dramas — CDramaDB`,
    description: intro.slice(0, 160),
  };
}

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default async function BestGenrePage({
  params,
}: {
  params: { locale: string; genre: string };
}) {
  const t = await getTranslations();
  const { locale, genre } = params;

  // Determine if this is a mood or genre filter
  const isMood = (ALL_MOODS as readonly string[]).includes(genre);
  const isGenre = (ALL_GENRES as readonly string[]).includes(genre);

  if (!isMood && !isGenre) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="font-display text-3xl text-ink-1 mb-4">
          {t('common.notFound')}
        </h1>
        <Link href={`/${locale}`} className="text-ruyao hover:underline">
          {t('common.backHome')}
        </Link>
      </div>
    );
  }

  // Fetch all dramas and filter
  let filteredDramas: any[] = [];
  try {
    const allDramas = await db.select().from(dramas).all();

    if (isMood) {
      filteredDramas = allDramas
        .filter((d) => {
          const tags = parseJsonArray<string>(d.moodTags);
          return tags.includes(genre);
        })
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      filteredDramas = allDramas
        .filter((d) => {
          const genres = parseJsonArray<string>(d.genres);
          return genres.some((g) => g.toLowerCase() === genre.toLowerCase());
        })
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
  } catch {
    filteredDramas = [];
  }

  // Editorial intro
  const intro = EDITORIAL_INTROS[genre]?.[locale] || EDITORIAL_INTROS[genre]?.en || '';
  const displayTitle = isMood
    ? `${MOOD_EMOJI[genre]} ${t(`mood.${genre}`)}`
    : t(`genre.${genre}`);

  // JSON-LD ItemList Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best ${displayTitle} C-Dramas`,
    description: intro,
    numberOfItems: filteredDramas.length,
    itemListElement: filteredDramas.slice(0, 30).map((drama, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: getLocalizedText(drama.titlesJson, locale, drama.originalTitle),
      url: `https://cdramadb.com/${locale}/drama/${drama.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="mb-12">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-1 mb-4 tracking-wider">
            {locale === 'en' ? 'Best' : locale === 'vi' ? 'Hay nhất' : 'ดีที่สุด'} {displayTitle}{' '}
            {locale === 'en' ? 'C-Dramas' : locale === 'vi' ? 'Phim Hoa' : 'ซีรีส์จีน'}
          </h1>
          {intro && (
            <p className="text-lg text-ink-3 max-w-3xl leading-relaxed">
              {intro}
            </p>
          )}
        </header>

        <div className="crackle-divider mb-12" />

        {/* Drama list — ranked */}
        <div className="space-y-0">
          {filteredDramas.slice(0, 30).map((drama, index) => {
            const title = getLocalizedText(drama.titlesJson, locale, drama.originalTitle);
            const synopsis = getLocalizedText(drama.synopsesJson, locale);
            const moodTags = parseJsonArray<string>(drama.moodTags);

            return (
              <Link
                key={drama.slug}
                href={`/${locale}/drama/${drama.slug}`}
                className="group"
              >
                <div className="flex items-stretch gap-5 py-5 border-b border-ivory-border/50 hover:bg-dingyao/50 transition-colors duration-song rounded-song px-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-10 flex items-center justify-center">
                    <span className={`font-display text-2xl font-bold ${
                      index < 3 ? 'text-zhusha' : 'text-ink-5'
                    }`}>
                      {index + 1}
                    </span>
                  </div>

                  {/* Poster */}
                  <div className="flex-shrink-0 w-16 md:w-20 aspect-[9/14] rounded-song overflow-hidden">
                    {drama.posterUrl ? (
                      <img
                        src={tmdbImage(drama.posterUrl, 'w342')}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-dingyao flex items-center justify-center">
                        <span className="text-ink-5 text-lg font-display">剧</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-display text-base md:text-lg font-semibold text-ink-1 group-hover:text-ruyao transition-colors duration-song leading-tight mb-1">
                      {title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-ink-4 mb-2">
                      {drama.year && <span>{drama.year}</span>}
                      {drama.rating && <span>★ {drama.rating.toFixed(1)}</span>}
                      {drama.episodes && <span>{drama.episodes}ep</span>}
                    </div>
                    <p className="text-sm text-ink-4 line-clamp-2 leading-relaxed hidden md:block">
                      {synopsis}
                    </p>
                    {/* Mood tags */}
                    {moodTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {moodTags.slice(0, 3).map((mood) => (
                          <span
                            key={mood}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-white ${MOOD_GRADIENT_CLASS[mood] || 'bg-mood-romantic'}`}
                          >
                            {MOOD_EMOJI[mood]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredDramas.length === 0 && (
          <div className="text-center py-20">
            <p className="text-ink-4 text-lg">
              {locale === 'en' ? 'No dramas found in this category yet. Check back soon!' : locale === 'vi' ? 'Chưa có phim nào trong danh mục này. Hãy quay lại sau!' : 'ยังไม่พบซีรีส์ในหมวดนี้ กลับมาเร็วๆ นี้!'}
            </p>
          </div>
        )}

        <div className="h-12" />
      </div>
    </>
  );
}
