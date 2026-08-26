export const dynamic = 'force-dynamic';
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
      alternates: {
        languages: {
          en: `${BASE_URL}/en`,
          vi: `${BASE_URL}/vi`,
          th: `${BASE_URL}/th`,
          id: `${BASE_URL}/id`,
          'x-default': `${BASE_URL}/en`,
        },
      },
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
        alternates: {
          languages: {
            en: `${BASE_URL}/en/drama/${slug}`,
            vi: `${BASE_URL}/vi/drama/${slug}`,
            th: `${BASE_URL}/th/drama/${slug}`,
            id: `${BASE_URL}/id/drama/${slug}`,
            'x-default': `${BASE_URL}/en/drama/${slug}`,
          },
        },
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
        alternates: {
          languages: {
            en: `${BASE_URL}/en/dramas-like/${slug}`,
            vi: `${BASE_URL}/vi/dramas-like/${slug}`,
            th: `${BASE_URL}/th/dramas-like/${slug}`,
            id: `${BASE_URL}/id/dramas-like/${slug}`,
            'x-default': `${BASE_URL}/en/dramas-like/${slug}`,
          },
        },
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
      alternates: {
        languages: {
          en: `${BASE_URL}/en/quiz`,
          vi: `${BASE_URL}/vi/quiz`,
          th: `${BASE_URL}/th/quiz`,
          id: `${BASE_URL}/id/quiz`,
          'x-default': `${BASE_URL}/en/quiz`,
        },
      },
    });
  }

  // ─── Starter Pack page (each locale) ───
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}/starter-pack`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/starter-pack`,
          vi: `${BASE_URL}/vi/starter-pack`,
          th: `${BASE_URL}/th/starter-pack`,
          id: `${BASE_URL}/id/starter-pack`,
          'x-default': `${BASE_URL}/en/starter-pack`,
        },
      },
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
        alternates: {
          languages: {
            en: `${BASE_URL}/en/best/${category}`,
            vi: `${BASE_URL}/vi/best/${category}`,
            th: `${BASE_URL}/th/best/${category}`,
            id: `${BASE_URL}/id/best/${category}`,
            'x-default': `${BASE_URL}/en/best/${category}`,
          },
        },
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
      alternates: {
        languages: {
          en: `${BASE_URL}/en/actors`,
          vi: `${BASE_URL}/vi/actors`,
          th: `${BASE_URL}/th/actors`,
          id: `${BASE_URL}/id/actors`,
          'x-default': `${BASE_URL}/en/actors`,
        },
      },
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
        alternates: {
          languages: {
            en: `${BASE_URL}/en/actor/${actor.slug}`,
            vi: `${BASE_URL}/vi/actor/${actor.slug}`,
            th: `${BASE_URL}/th/actor/${actor.slug}`,
            id: `${BASE_URL}/id/actor/${actor.slug}`,
            'x-default': `${BASE_URL}/en/actor/${actor.slug}`,
          },
        },
      });
    }
  }

  // ─── Blog pages (English only — SE-02) ───
  const { getAllArticles } = await import('@/lib/blog');
  const blogArticles = getAllArticles();
  if (blogArticles.length > 0) {
    // Blog list page
    entries.push({
      url: `${BASE_URL}/en/blog`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
    // Individual articles
    for (const article of blogArticles) {
      entries.push({
        url: `${BASE_URL}/en/blog/${article.slug}`,
        lastModified: article.date,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }

  return entries;
}
