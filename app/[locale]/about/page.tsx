export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { AUTHORS } from '@/lib/authors';

// ────────────────────────────────────────
// Metadata (SEO-02: About page establishes E-E-A-T)
// ────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  return {
    title: 'About CDramaBinge — Our Editorial Team & How We Rate Chinese Dramas',
    description:
      'CDramaBinge is an independent editorial guide to Chinese TV dramas. Meet our team, learn how we rate and curate shows, and why you can trust our recommendations.',
    alternates: {
      canonical: `https://cdramabinge.com/${params.locale}/about`,
    },
  };
}

// ────────────────────────────────────────
// JSON-LD: Organization + employees (E-E-A-T signal)
// ────────────────────────────────────────
function AboutJsonLd() {
  const team = Object.values(AUTHORS);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'CDramaBinge',
          url: 'https://cdramabinge.com',
          logo: 'https://cdramabinge.com/logo.png',
          description: 'Independent editorial guide to Chinese television dramas.',
          founder: {
            '@type': 'Person',
            name: 'Mei Lin',
            jobTitle: 'Editor-in-Chief',
          },
          employee: team.map((a) => ({
            '@type': 'Person',
            name: a.name,
            jobTitle: a.role,
            description: a.bio,
          })),
          contactPoint: {
            '@type': 'ContactPoint',
            email: 'cdramabinge@gmail.com',
            contactType: 'editorial',
            availableLanguage: ['English'],
          },
        }),
      }}
    />
  );
}

// ────────────────────────────────────────
// Team members for rendering (localized roles)
// ────────────────────────────────────────
const TEAM = [
  {
    author: AUTHORS['mei-lin'],
    headingKey: 'editor-in-chief',
  },
  {
    author: AUTHORS['daniel-park'],
    headingKey: 'staff-writer',
  },
  {
    author: AUTHORS['sirin-srivikorn'],
    headingKey: 'contributor',
  },
];

function localizedRole(locale: string, authorKey: string): string {
  const a = AUTHORS[authorKey];
  if (!a) return '';
  if (locale === 'vi') return a.roleVi;
  if (locale === 'th') return a.roleTh;
  if (locale === 'id') return a.roleId;
  return a.role;
}

// ────────────────────────────────────────
// Page
// ────────────────────────────────────────
export default function AboutPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;

  return (
    <>
      <AboutJsonLd />
      <div className="min-h-screen bg-ivory">
        {/* Hero */}
        <section className="bg-dingyao border-b border-ivory-border">
          <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-ink-1 tracking-wider leading-tight mb-4">
              About CDramaBinge
            </h1>
            <p className="text-ink-3 text-lg md:text-xl font-display italic max-w-2xl mx-auto leading-relaxed">
              An independent, editorially-minded guide to Chinese television drama — built by people who actually watch the shows, start to finish.
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* Why we built this */}
          <section className="mb-16">
            <h2 className="font-display text-2xl font-semibold text-ink-1 mb-6 tracking-wider">
              Why we built this
            </h2>
            <div className="space-y-4 text-ink-2 leading-relaxed">
              <p>
                Chinese television drama has quietly become one of the most exciting storytelling traditions in the world — from 70-episode historical epics to tightly plotted 12-episode thrillers, xianxia fantasies to slice-of-life romances. But for viewers outside China, discovering what&apos;s actually worth watching is harder than it should be.
              </p>
              <p>
                Streaming platforms bury great shows under algorithmic shelves. Review sites are either sparsely populated or flooded with ratings that don&apos;t tell you <em>why</em> a drama works. Fan translations come and go. There was no single place that treated Chinese drama with the same editorial seriousness that Western television gets — until now.
              </p>
              <p>
                CDramaBinge exists to fix that. Every drama in our database has been watched or screened by our editorial team. Every recommendation comes with a reason. We don&apos;t aggregate other people&apos;s opinions — we form our own.
              </p>
            </div>
          </section>

          <div className="crackle-divider mb-16" />

          {/* How we choose and rate */}
          <section className="mb-16">
            <h2 className="font-display text-2xl font-semibold text-ink-1 mb-8 tracking-wider">
              How we choose and rate
            </h2>
            <div className="space-y-6">
              <div className="song-card p-6">
                <h3 className="font-display text-lg font-semibold text-ink-1 mb-2">
                  We watch before we write
                </h3>
                <p className="text-ink-3 leading-relaxed">
                  No recommendation goes live unless at least one editor has watched the drama in full (or, for currently-airing shows, up to the latest available episodes). Synopses and metadata come from our data partners, but our opinions are always our own.
                </p>
              </div>
              <div className="song-card p-6">
                <h3 className="font-display text-lg font-semibold text-ink-1 mb-2">
                  Ratings reflect craft, not hype
                </h3>
                <p className="text-ink-3 leading-relaxed">
                  Our ratings weigh writing, acting, production quality, and payoff — not just popularity or star power. A blockbuster with sloppy writing will score lower than a small drama with a perfect script.
                </p>
              </div>
              <div className="song-card p-6">
                <h3 className="font-display text-lg font-semibold text-ink-1 mb-2">
                  No paid placements. Ever.
                </h3>
                <p className="text-ink-3 leading-relaxed">
                  We never accept payment to feature, rank, or recommend a drama. Our &quot;Editor&apos;s Picks&quot; are chosen purely on merit. This is a reader-funded, independent publication.
                </p>
              </div>
            </div>
          </section>

          <div className="crackle-divider mb-16" />

          {/* Meet the team */}
          <section id="editorial-team" className="mb-16">
            <h2 className="font-display text-2xl font-semibold text-ink-1 mb-8 tracking-wider">
              Meet the team
            </h2>
            <div className="space-y-6">
              {TEAM.map(({ author, headingKey }) => (
                <div key={headingKey} className="song-card p-6 flex gap-5">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-ruyao/15 border border-ivory-border flex items-center justify-center">
                    <span className="font-display text-xl font-bold text-ruyao">
                      {author.initials}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink-1">
                      {author.name}
                    </h3>
                    <p className="text-xs text-ink-4 uppercase tracking-wider mb-2">
                      {localizedRole(locale, headingKey)}
                    </p>
                    <p className="text-ink-3 text-sm leading-relaxed">
                      {author.bio}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="crackle-divider mb-16" />

          {/* Contact */}
          <section className="mb-16">
            <h2 className="font-display text-2xl font-semibold text-ink-1 mb-4 tracking-wider">
              Get in touch
            </h2>
            <p className="text-ink-3 leading-relaxed mb-4">
              Editorial questions, corrections, or drama tips:{' '}
              <a
                href="mailto:cdramabinge@gmail.com"
                className="text-ruyao hover:underline"
              >
                cdramabinge@gmail.com
              </a>
            </p>
            <p className="text-ink-3 leading-relaxed">
              We welcome corrections — if we&apos;ve misstated an episode count, a release date, or a fact, email us and we&apos;ll fix it within 48 hours and note the correction.
            </p>
          </section>

          <div className="h-8" />
        </div>

        {/* Footer disclaimer */}
        <div className="bg-dingyao border-t border-ivory-border py-8">
          <div className="max-w-3xl mx-auto px-6">
            <p className="text-ink-5 text-xs leading-relaxed">
              CDramaBinge is an independent publication. Drama metadata and synopses are sourced from The Movie Database (TMDB) and public information; all ratings, &quot;Our Take&quot; reviews, and recommendations are the original work of our editorial team. This site is reader-supported; when you stream through links on our pages, we may earn a small affiliate commission at no cost to you.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
