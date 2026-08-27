import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAllSlugs, getArticleBySlug } from '@/lib/blog';
import { db } from '@/lib/db';
import { dramas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getLocalizedText, tmdbImage, isPlaceholderPoster } from '@/lib/utils/helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// Blog is English-only — other locales are 301 redirected by middleware
export function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ locale: 'en', slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const article = getArticleBySlug(params.slug);
  if (!article) return { title: 'Article Not Found' };

  const url = `https://cdramabinge.com/en/blog/${article.slug}`;

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url,
      type: 'article',
      publishedTime: article.date,
      authors: [article.author],
      images: article.coverImage ? [{ url: article.coverImage, width: 1200, height: 630, alt: article.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  };
}

// Related drama card data
interface RelatedDrama {
  slug: string;
  title: string;
  posterUrl: string | null;
  year: number | null;
}

async function getRelatedDramaData(slugs: string[]): Promise<RelatedDrama[]> {
  const results: RelatedDrama[] = [];
  for (const slug of slugs) {
    try {
      const drama = await db.select().from(dramas).where(eq(dramas.slug, slug)).get();
      if (drama) {
        results.push({
          slug: drama.slug,
          title: getLocalizedText(drama.titlesJson, 'en', drama.originalTitle),
          posterUrl: drama.posterUrl && !isPlaceholderPoster(drama.posterUrl)
            ? tmdbImage(drama.posterUrl, 'w342')
            : null,
          year: drama.year,
        });
      }
    } catch {
      // Skip if not found
    }
  }
  return results;
}

export default async function BlogDetailPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const article = getArticleBySlug(params.slug);
  if (!article) notFound();

  // Extract FAQ sections from content (## FAQ heading followed by Q/A pairs)
  const faqItems = extractFaq(article.content);

  // Load related drama data
  const relatedDramas = article.relatedDramas.length > 0
    ? await getRelatedDramaData(article.relatedDramas)
    : [];

  // Article JSON-LD
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: article.coverImage || undefined,
    datePublished: article.date,
    author: {
      '@type': 'Organization',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'CDramaBinge',
      logo: {
        '@type': 'ImageObject',
        url: 'https://cdramabinge.com/android-chrome-512x512.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://cdramabinge.com/en/blog/${article.slug}`,
    },
  };

  // FAQ JSON-LD
  const faqJsonLd = faqItems.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <article className="max-w-3xl mx-auto px-6 py-12">
        {article.coverImage && (
          <div className="relative w-full aspect-[16/9] rounded-song overflow-hidden mb-10 -mt-12">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover"
              width={1200}
              height={675}
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        )}

        {/* Back link */}
        <Link
          href="/en/blog"
          className="inline-flex items-center text-sm text-ink-4 hover:text-ruyao transition-colors mb-8"
        >
          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <time className="text-sm text-ink-4">
              {new Date(article.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            {article.tags.length > 0 && (
              <div className="flex gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-song bg-dingyao text-ink-4 border border-ivory-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-1 tracking-wider leading-tight mb-4">
            {article.title}
          </h1>
          <p className="text-ink-4 text-sm">{article.author}</p>
        </header>

        {/* Markdown content */}
        <div className="blog-content max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => {
                // Internal links use Next.js Link
                if (href && (href.startsWith('/') || href.startsWith('#'))) {
                  return (
                    <Link href={href} className="text-ruyao hover:underline">
                      {children}
                    </Link>
                  );
                }
                // External links open in new tab
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ruyao hover:underline"
                  >
                    {children}
                  </a>
                );
              },
              h2: ({ children }) => (
                <h2 className="font-display text-2xl font-semibold text-ink-1 mt-10 mb-4 tracking-wider">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-display text-xl font-semibold text-ink-1 mt-8 mb-3">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-ink-2 leading-relaxed mb-5">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-2 mb-6 text-ink-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-2 mb-6 text-ink-2">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-ink-1">{children}</strong>
              ),
              img: ({ src, alt }: { src?: string; alt?: string }) => (
                <img
                  src={src}
                  alt={alt || ''}
                  className="my-4 rounded-song border border-ivory-border shadow-sm"
                  style={{ width: '160px', height: 'auto' }}
                  loading="lazy"
                />
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-ruyao/40 pl-5 py-2 my-6 bg-dingyao/50 rounded-r-song">
                  <div className="text-ink-3 italic">{children}</div>
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-6">
                  <table className="w-full border-collapse text-sm">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-ivory-border px-4 py-2 bg-dingyao text-left font-semibold text-ink-1">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-ivory-border px-4 py-2 text-ink-2">{children}</td>
              ),
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>

        {/* Related Dramas */}
        {relatedDramas.length > 0 && (
          <section className="mt-12 pt-8 border-t border-ivory-border">
            <h2 className="font-display text-xl font-semibold text-ink-1 mb-6">
              Dramas Mentioned in This Article
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {relatedDramas.map((drama) => (
                <Link
                  key={drama.slug}
                  href={`/en/drama/${drama.slug}`}
                  className="group"
                >
                  <div className="aspect-[2/3] rounded-song overflow-hidden bg-dingyao border border-ivory-border mb-2 group-hover:border-liuli-gold transition-colors">
                    {drama.posterUrl ? (
                      <img
                        src={drama.posterUrl}
                        alt={drama.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        width={342}
                        height={513}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <span className="text-xs text-ink-4 text-center">{drama.title}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink-1 truncate group-hover:text-liuli-gold transition-colors">
                    {drama.title}
                  </p>
                  {drama.year && <p className="text-xs text-ink-4">{drama.year}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Pages */}
        {article.relatedPages.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold text-ink-1 mb-4">
              Explore More
            </h2>
            <div className="flex flex-wrap gap-3">
              {article.relatedPages.map((pageUrl) => (
                <Link
                  key={pageUrl}
                  href={pageUrl}
                  className="px-4 py-2 rounded-song border border-ivory-border text-sm text-ink-2 hover:border-ruyao hover:text-ruyao transition-colors"
                >
                  {pageUrl.replace('/en/', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

/**
 * Extract FAQ items from markdown content.
 * Looks for a ## FAQ section followed by **Q:** / **A:** pairs or ### Q / A patterns.
 */
function extractFaq(content: string): Array<{ question: string; answer: string }> {
  const faqSection = content.match(/##\s*FAQ\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  if (!faqSection) return [];

  const faqText = faqSection[1];
  const items: Array<{ question: string; answer: string }> = [];

  // Match patterns like:
  // **Q: question text?**
  // answer text
  const qPattern = /\*\*Q:\s*(.+?)\*\*\s*\n([\s\S]*?)(?=\n\*\*Q:|$)/g;
  let match;
  while ((match = qPattern.exec(faqText)) !== null) {
    items.push({
      question: match[1].trim(),
      answer: match[2].trim().replace(/\n+/g, ' '),
    });
  }

  // Also try ### heading style
  if (items.length === 0) {
    const h3Pattern = /###\s*(.+?)\s*\n([\s\S]*?)(?=\n###\s|$)/g;
    while ((match = h3Pattern.exec(faqText)) !== null) {
      const q = match[1].trim();
      const a = match[2].trim();
      if (q.includes('?')) {
        items.push({ question: q, answer: a.replace(/\n+/g, ' ') });
      }
    }
  }

  return items;
}
