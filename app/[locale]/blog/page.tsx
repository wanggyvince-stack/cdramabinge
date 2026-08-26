import { Metadata } from 'next';
import Link from 'next/link';
import { getAllArticles } from '@/lib/blog';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// Blog is English-only — other locales are 301 redirected by middleware
export function generateStaticParams() {
  return [{ locale: 'en' }];
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Blog — Chinese Drama Guides & Recommendations | CDramaBinge',
    description: 'Expert guides, mood-based recommendations, and streaming tips for Chinese drama fans. Discover your next c-drama on CDramaBinge.',
    alternates: {
      canonical: 'https://cdramabinge.com/en/blog',
    },
    openGraph: {
      title: 'Blog — Chinese Drama Guides & Recommendations | CDramaBinge',
      description: 'Expert guides, mood-based recommendations, and streaming tips for Chinese drama fans.',
      url: 'https://cdramabinge.com/en/blog',
      type: 'website',
    },
  };
}

export default function BlogListPage() {
  const articles = getAllArticles();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-12">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-ink-1 tracking-wider mb-4">
          CDramaBinge Blog
        </h1>
        <p className="text-lg text-ink-3 leading-relaxed">
          Guides, recommendations, and deep dives into the world of Chinese drama.
        </p>
      </header>

      {articles.length === 0 ? (
        <div className="song-card p-12 text-center">
          <p className="text-ink-4 text-lg">Articles coming soon.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {articles.map((article) => (
            <article key={article.slug} className="song-card p-6 md:p-8 hover:border-liuli-gold/40 transition-colors">
              <Link href={`/en/blog/${article.slug}`} className="block group">
                <div className="flex items-center gap-3 mb-3">
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
                <h2 className="font-display text-2xl font-semibold text-ink-1 mb-2 group-hover:text-liuli-gold transition-colors">
                  {article.title}
                </h2>
                <p className="text-ink-3 leading-relaxed">{article.description}</p>
                <span className="inline-block mt-4 text-ruyao text-sm font-medium group-hover:underline">
                  Read more
                </span>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
