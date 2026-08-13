import Link from 'next/link';
import DramaPoster from '@/components/DramaPoster';

interface SimilarDrama {
  slug: string;
  title: string;
  posterUrl?: string | null;
  reason?: string;
  score?: number;
}

interface SimilarDramasProps {
  dramas: SimilarDrama[];
  title: string;
  locale: string;
}

/**
 * SimilarDramas — AI 推荐相似剧列表
 */
export default function SimilarDramas({ dramas, title, locale }: SimilarDramasProps) {
  if (dramas.length === 0) return null;

  return (
    <section className="py-12 md:py-16">
      <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-1 mb-8 tracking-wider">
        {title}
      </h2>

      <div className="horizontal-scroll song-scrollbar">
        <div className="flex gap-5 pb-4">
          {dramas.map((drama, index) => (
            <Link
              key={drama.slug}
              href={`/${locale}/drama/${drama.slug}`}
              className="flex-shrink-0 w-40 group"
            >
              <div className="song-card overflow-hidden glaze-hover">
                <div className="relative aspect-[9/14] overflow-hidden">
                  <DramaPoster
                    src={drama.posterUrl}
                    alt={drama.title}
                    title={drama.title}
                    slug={drama.slug}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Rank badge */}
                  <div className="absolute top-2 left-2 w-6 h-6 bg-zhusha/90 text-white text-xs font-bold rounded-song flex items-center justify-center">
                    {index + 1}
                  </div>
                </div>

                <div className="p-2.5 bg-dingyao">
                  <h3 className="font-display text-sm font-semibold text-ink-2 line-clamp-1">
                    {drama.title}
                  </h3>
                  {drama.reason && (
                    <p className="text-xs text-ink-4 mt-1 line-clamp-2 leading-relaxed">
                      {drama.reason}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
