/**
 * Blog content loader — SE-02
 *
 * Reads Markdown files from data/blog/, parses frontmatter,
 * and provides typed access for blog list/detail pages.
 *
 * Frontmatter format (YAML-like, simple key:value):
 * ---
 * slug: "article-slug"
 * title: "Article Title"
 * description: "SEO description"
 * author: "CDramaBinge Editorial"
 * date: "2026-08-27"
 * tags: ["tag1", "tag2"]
 * relatedDramas: ["slug1", "slug2"]
 * relatedPages: ["/en/starter-pack"]
 * ---
 */

import fs from 'node:fs';
import path from 'node:path';

const BLOG_DIR = path.join(process.cwd(), 'data', 'blog');

export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string; // YYYY-MM-DD
  tags: string[];
  coverImage: string;
  relatedDramas: string[];
  relatedPages: string[];
  content: string; // markdown body (without frontmatter)
}

/**
 * Parse frontmatter from markdown content.
 * Simple parser supporting string, array (JSON-style), and date values.
 */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const [, fmBlock, content] = match;
  const data: Record<string, unknown> = {};

  for (const line of fmBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value: string = line.slice(colonIdx + 1).trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Try parsing as JSON array (for tags, relatedDramas, etc.)
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        data[key] = JSON.parse(value);
        continue;
      } catch {
        // fall through to string
      }
    }

    data[key] = value;
  }

  return { data, content: content.trim() };
}

/**
 * Get all blog articles, sorted by date descending.
 */
export function getAllArticles(): BlogArticle[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
  const articles: BlogArticle[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    const { data, content } = parseFrontmatter(raw);

    const slug = (data.slug as string) || file.replace(/\.md$/, '');

    articles.push({
      slug,
      title: data.title as string || slug,
      description: data.description as string || '',
      author: data.author as string || 'CDramaBinge Editorial',
      date: data.date as string || '2026-01-01',
      tags: Array.isArray(data.tags) ? data.tags as string[] : [],
      coverImage: (data.coverImage as string) || '',
      relatedDramas: Array.isArray(data.relatedDramas) ? data.relatedDramas as string[] : [],
      relatedPages: Array.isArray(data.relatedPages) ? data.relatedPages as string[] : [],
      content,
    });
  }

  return articles.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get a single article by slug.
 */
export function getArticleBySlug(slug: string): BlogArticle | null {
  const articles = getAllArticles();
  return articles.find((a) => a.slug === slug) || null;
}

/**
 * Get all article slugs (for generateStaticParams).
 */
export function getAllSlugs(): string[] {
  return getAllArticles().map((a) => a.slug);
}
