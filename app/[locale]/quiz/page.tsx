import { getLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { ALL_QUIZ_DRAMA_SLUGS } from '@/data/quiz-data';
import { tmdbImage, getLocalizedText } from '@/lib/utils/helpers';
import QuizClient from '@/components/QuizClient';

// ────────────────────────────────────────
// Fetch drama data for quiz recommendations
// ────────────────────────────────────────

async function getDramasBySlugs(slugs: string[], locale: string) {
  if (slugs.length === 0) return {};
  try {
    const results = await db
      .select()
      .from(dramas)
      .where(inArray(dramas.slug, slugs))
      .all();

    const map: Record<string, { slug: string; title: string; posterUrl: string | null; year: number | null }> = {};
    for (const d of results) {
      const title = getLocalizedText(d.titlesJson, locale, d.originalTitle);
      map[d.slug] = {
        slug: d.slug,
        title,
        posterUrl: d.posterUrl ? tmdbImage(d.posterUrl, 'w500') : null,
        year: d.year || null,
      };
    }
    return map;
  } catch {
    return {};
  }
}

// ────────────────────────────────────────
// Page
// ────────────────────────────────────────

export async function generateMetadata() {
  return {
    title: 'C-drama Soul Type Quiz',
    description: 'Take our 7-question quiz to discover your drama-watching archetype.',
  };
}

export default async function QuizPage() {
  const locale = await getLocale();
  const dramasBySlug = await getDramasBySlugs(ALL_QUIZ_DRAMA_SLUGS, locale);

  return (
    <div className="pt-20 pb-16">
      <Suspense fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-zhusha/30 border-t-zhusha rounded-full animate-spin" />
        </div>
      }>
        <QuizClient locale={locale} dramasBySlug={dramasBySlug} />
      </Suspense>
    </div>
  );
}
