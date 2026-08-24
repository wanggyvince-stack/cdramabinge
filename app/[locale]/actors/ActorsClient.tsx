'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const PAGE_SIZE = 60;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  dramas: string;
  born: string;
  noResults: string;
  previous: string;
  next: string;
  page: string;
}

export default function ActorsClient({
  actors,
  locale,
  labels,
}: {
  actors: ActorItem[];
  locale: string;
  labels: Labels;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPage = Number(searchParams.get('page') || '1');
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Sort actors alphabetically by name
  const sortedActors = useMemo(() => {
    return [...actors].sort((a, b) => a.name.localeCompare(b.name));
  }, [actors]);

  // Filtered actors
  const filtered = useMemo(() => {
    if (!query.trim()) return sortedActors;
    const q = query.toLowerCase().trim();
    return sortedActors.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.zhName.includes(q) ||
        a.slug.replace(/-/g, ' ').includes(q)
    );
  }, [sortedActors, query]);

  // Letters that have actors
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    sortedActors.forEach((a) => {
      const first = a.name.charAt(0).toUpperCase();
      if (/[A-Z]/.test(first)) set.add(first);
    });
    return set;
  }, [sortedActors]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.min(Math.max(1, page), totalPages);
      setCurrentPage(clamped);
      router.push(`/${locale}/actors?page=${clamped}`, { scroll: false });
      const el = document.getElementById('actors-grid-top');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    },
    [locale, router, totalPages]
  );

  const handleLetterClick = useCallback(
    (letter: string) => {
      if (!availableLetters.has(letter)) return;
      // Find first actor index with this letter
      const idx = filtered.findIndex((a) => a.name.charAt(0).toUpperCase() === letter);
      if (idx === -1) return;
      const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
      setCurrentPage(targetPage);
      router.push(`/${locale}/actors?page=${targetPage}`, { scroll: false });
      setTimeout(() => {
        const el = document.getElementById(`letter-${letter}`);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    [locale, router, filtered, availableLetters]
  );

  // Group page items by first letter for section headers
  const groupedItems = useMemo(() => {
    const groups: { letter: string; items: ActorItem[] }[] = [];
    let currentLetter = '';
    for (const item of pageItems) {
      const letter = item.name.charAt(0).toUpperCase();
      if (/[A-Z]/.test(letter) && letter !== currentLetter) {
        currentLetter = letter;
        groups.push({ letter, items: [item] });
      } else if (groups.length > 0) {
        groups[groups.length - 1].items.push(item);
      }
    }
    return groups;
  }, [pageItems]);

  return (
    <>
      {/* Header */}
      <div className="mb-6" id="actors-grid-top">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-ink-1 tracking-wider mb-2">
          {labels.title}
        </h1>
        <p className="text-ink-4 text-sm">{labels.subtitle}</p>
      </div>

      {/* Search bar */}
      <div className="mb-6">
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
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
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

      {/* A-Z Letter Navigation */}
      <div className="mb-8 flex flex-wrap gap-1">
        {ALPHABET.map((letter) => {
          const isActive = availableLetters.has(letter);
          return (
            <button
              key={letter}
              onClick={() => handleLetterClick(letter)}
              disabled={!isActive}
              className={`w-8 h-8 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-ruyao/10 text-ruyao hover:bg-ruyao/20 cursor-pointer'
                  : 'text-ink-5/40 cursor-default'
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {groupedItems.map((group) => (
              <div key={group.letter} className="contents">
                {/* Section header spanning full row */}
                <div
                  id={`letter-${group.letter}`}
                  className="col-span-full pt-4 pb-2"
                >
                  <span className="font-display text-2xl font-bold text-ruyao/70">
                    {group.letter}
                  </span>
                </div>
                {group.items.map((actor) => (
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
                          width={200}
                          height={300}
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
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage <= 1}
                className="px-4 py-2 text-sm rounded-lg border border-ivory-border text-ink-3 hover:bg-dingyao disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                {labels.previous}
              </button>
              <span className="text-sm text-ink-4">
                {labels.page} {safePage} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="px-4 py-2 text-sm rounded-lg border border-ivory-border text-ink-3 hover:bg-dingyao disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                {labels.next}
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-ink-4 text-sm py-12 text-center">{labels.noResults}</p>
      )}
    </>
  );
}
