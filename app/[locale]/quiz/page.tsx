export const dynamic = 'force-dynamic';

import { getLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { ALL_QUIZ_DRAMA_SLUGS } from '@/data/quiz-data';
import { tmdbImage, getLocalizedText } from '@/lib/utils/helpers';
import QuizClient from '@/components/QuizClient';
import type { Metadata } from 'next';

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
        posterUrl: d.posterUrl ? tmdbImage(d.posterUrl, 'w780') : null,
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

// Quiz result type labels for OG images
const QUIZ_RESULT_LABELS: Record<string, { title: string; subtitle: string }> = {
  romantic: { title: 'The Hopeless Romantic', subtitle: 'You watch dramas with your whole heart' },
  schemer: { title: 'The Palace Schemer', subtitle: 'Every scene is a chess game' },
  thrill: { title: 'The Thrill Seeker', subtitle: 'Heart-pounding suspense is your drama fuel' },
  aesthetic: { title: 'The Aesthetic Soul', subtitle: 'Beauty is not a bonus — it\'s the point' },
  feelgood: { title: 'The Feel-Good Seeker', subtitle: 'Life\'s too short for dramas that drain you' },
  philosophy: { title: 'The Philosophy Nerd', subtitle: 'You don\'t just watch stories — you dissect them' },
  action: { title: 'The Action Hero', subtitle: 'If there\'s no fight scene, is it even a drama?' },
  nightowl: { title: 'The Night Owl Dreamer', subtitle: 'The best drama experience is at 2 AM' },
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { result?: string };
}): Promise<Metadata> {
  const { locale } = params;
  const resultKey = searchParams?.result;
  const resultData = resultKey ? QUIZ_RESULT_LABELS[resultKey] : null;

  const title = resultData
    ? `${resultData.title} — C-drama Soul Type Quiz`
    : 'C-drama Soul Type Quiz';
  const description = resultData
    ? `I'm ${resultData.title}! ${resultData.subtitle}. Take the quiz on CDramaBinge.`
    : 'Take our 7-question quiz to discover your drama-watching archetype.';

  // Dynamic OG image based on result
  const ogUrl = new URL('/api/og', 'https://cdramabinge.com');
  if (resultData) {
    ogUrl.searchParams.set('type', 'quiz');
    ogUrl.searchParams.set('title', resultData.title);
    ogUrl.searchParams.set('subtitle', resultData.subtitle);
  } else {
    ogUrl.searchParams.set('type', 'quiz');
    ogUrl.searchParams.set('title', 'Your C-drama Soul Type');
    ogUrl.searchParams.set('subtitle', 'Take the quiz on CDramaBinge');
  }

  const canonicalUrl = `https://cdramabinge.com/${locale}/quiz`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `https://cdramabinge.com/en/quiz`,
        vi: `https://cdramabinge.com/vi/quiz`,
        th: `https://cdramabinge.com/th/quiz`,
        'x-default': `https://cdramabinge.com/en/quiz`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [{ url: ogUrl.toString(), width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl.toString()],
    },
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
