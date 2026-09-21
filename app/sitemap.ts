export const revalidate = 3600;
import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { ALL_MOODS, ALL_GENRES } from '@/lib/utils/helpers';

const BASE_URL = 'https://cdramabinge.com';
const LOCALES = ['en'] as const;

// All genre/mood slugs for /best/ pages — single source of truth in helpers (SEO-10)
const BEST_CATEGORIES: string[] = [...ALL_MOODS, ...ALL_GENRES];

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
          'x-default': `${BASE_URL}/en/quiz`,
        },
      },
    });
  }

  // ─── About page (each locale) — SEO-02 E-E-A-T ───
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}/about`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.5,
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
          'x-default': `${BASE_URL}/en/actors`,
        },
      },
    });
  }

  // ─── Actor detail pages — REMOVED (SEO-03: noindex, follow) ───
  // Actor detail pages are now noindex to avoid thin-content drag on site quality signal.
  // The actors listing page (/actors) is still included above.

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
