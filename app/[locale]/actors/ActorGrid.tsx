'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface ActorItem {
  slug: string;
  name: string;
  zhName: string;
  photoUrl: string;
  dramaCount: number;
  birthday: string;
  birthplace: string;
}

interface Labels {
  searchPlaceholder: string;
  dramas: string;
  born: string;
  noResults: string;
}

export default function ActorGrid({
  actors,
  locale,
  labels,
}: {
  actors: ActorItem[];
  locale: string;
  labels: Labels;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return actors;
    const q = query.toLowerCase().trim();
    return actors.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.zhName.includes(q) ||
        a.slug.replace(/-/g, ' ').includes(q)
    );
  }, [actors, query]);

  return (
    <>
      {/* Search bar */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 bg-ivory-dark/60 border border-ivory-border rounded-lg text-sm text-ink-2 placeholder:text-ink-5 focus:outline-none focus:border-ruyao/60 focus:ring-1 focus:ring-ruyao/30 transition-colors"
          />
        </div>
      </div>

      {/* Results count */}
      {query && (
        <p className="text-xs text-ink-4 mb-4">
          {filtered.length} / {actors.length}
        </p>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {filtered.map((actor) => (
            <Link
              key={actor.slug}
              href={`/${locale}/actor/${actor.slug}`}
              className="group"
            >
              {/* Photo */}
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-dingyao mb-2 shadow-sm">
                {actor.photoUrl ? (
                  <img
                    src={actor.photoUrl}
                    alt={actor.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-ink-5/40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Name */}
              <p className="text-sm text-ink-1 font-medium truncate group-hover:text-ruyao transition-colors">
                {actor.name}
              </p>

              {/* Chinese name */}
              {actor.zhName && actor.zhName !== actor.name && (
                <p className="text-xs text-ink-4 truncate">{actor.zhName}</p>
              )}

              {/* Drama count badge */}
              {actor.dramaCount > 0 && (
                <p className="text-xs text-ink-5 mt-0.5">
                  {actor.dramaCount} {labels.dramas}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-ink-4 text-sm py-12 text-center">{labels.noResults}</p>
      )}
    </>
  );
}
