import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { dramas, actors } from '@/lib/db/schema';

const BASE_URL = 'https://cdramabinge.com';
const LOCALES = ['en', 'vi', 'th', 'id'] as const;

// All genre/mood slugs for /best/ pages
const BEST_CATEGORIES = [
  'romance', 'historical', 'fantasy', 'wuxia', 'xianxia',
  'modern', 'thriller', 'comedy', 'drama', 'action', 'mystery', 'sci_fi',
  'wanna_cry', 'light_fun', 'intense', 'romantic', 'mindbending',
  'spooky', 'empowering', 'aesthetic',
];

/** Build hreflang alternates for a given path */
function buildAlternates(path: string) {
  return {
    languages: {
      en: `${BASE_URL}/en${path}`,
      vi: `${BASE_URL}/vi${path}`,
      th: `${BASE_URL}/th${path}`,
      id: `${BASE_URL}/id${path}`,
      'x-default': `${BASE_URL}/en${path}`,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allDramas = await db.select({ slug: dramas.slug }).from(dramas).all();
  const dramaSlugs = allDramas.map((d) => d.slug);

  const today = new Date().toISOString().split('T')[0];

  const entries: MetadataRoute.Sitemap = [];

  // ─── Homepage (each locale) ───
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: today,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: buildAlternates(''),
    });
  }

  // ─── Drama detail pages ───
  for (const slug of dramaSlugs) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/drama/${slug}`,
        lastModified: today,
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: buildAlternates(`/drama/${slug}`),
      });
    }
  }

  // ─── Dramas-like pages (same slugs as dramas) ───
  for (const slug of dramaSlugs) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/dramas-like/${slug}`,
        lastModified: today,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: buildAlternates(`/dramas-like/${slug}`),
      });
    }
  }

  // ─── Quiz page (each locale) ───
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}/quiz`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: buildAlternates('/quiz'),
    });
  }

  // ─── Starter Pack page (each locale) ───
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}/starter-pack`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: buildAlternates('/starter-pack'),
    });
  }

  // ─── Best category pages ───
  for (const category of BEST_CATEGORIES) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/best/${category}`,
        lastModified: today,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: buildAlternates(`/best/${category}`),
      });
    }
  }

  // ─── Actors listing page ───
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}/actors`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: buildAlternates('/actors'),
    });
  }

  // ─── Actor pages (only actors with 2+ dramas to avoid thin content) ───
  const allActors = await db.select({ slug: actors.slug, dramasJson: actors.dramasJson }).from(actors).all();
  for (const actor of allActors) {
    try {
      const dramaEntries = JSON.parse(actor.dramasJson || '[]');
      if (dramaEntries.length < 2) continue;
    } catch {
      continue;
    }
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/actor/${actor.slug}`,
        lastModified: today,
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: buildAlternates(`/actor/${actor.slug}`),
      });
    }
  }

  return entries;
}
