import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';

const BASE_URL = 'https://cdramabinge.com';
const LOCALES = ['en', 'vi', 'th'] as const;

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
          },
        },
      });
    }
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
          },
        },
      });
    }
  }

  return entries;
}
