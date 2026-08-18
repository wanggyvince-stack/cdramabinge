'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MOOD_SELECTOR_BASE_CLASS, MOOD_SELECTOR_STYLES } from '@/lib/utils/helpers';

interface DramaInfo {
  slug: string;
  title: string;
  posterUrl: string | null;
  rating: number | null;
}

interface MoodDiscoverySectionProps {
  moods: readonly string[];
  labels: Record<string, string>;
  dramaMap: Record<string, DramaInfo[]>;
  totalCounts: Record<string, number>;
  locale: string;
}

/**
 * MoodDiscoverySection — Grid preview mode.
 * 8 mood buttons in a row; clicking one opens a 3×2 grid below with top 6 dramas.
 * Clicking another mood smoothly transitions the grid content.
 * Clicking the same mood again collapses the grid.
 */
export default function MoodDiscoverySection({
  moods,
  labels,
  dramaMap,
  totalCounts,
  locale,
}: MoodDiscoverySectionProps) {
  const [activeMood, setActiveMood] = useState<string | null>(null);

  const handleMoodClick = (mood: string) => {
    setActiveMood((prev) => (prev === mood ? null : mood));
  };

  const activeDramas = activeMood ? (dramaMap[activeMood] || []).slice(0, 6) : [];
  const activeTotal = activeMood ? (totalCounts[activeMood] || 0) : 0;

  return (
    <div>
      {/* Mood buttons row */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-6">
        {moods.map((mood) => {
          const style = MOOD_SELECTOR_STYLES[mood] || MOOD_SELECTOR_STYLES['romantic'];
          const isActive = activeMood === mood;
          return (
            <button
              key={mood}
              onClick={() => handleMoodClick(mood)}
              className={MOOD_SELECTOR_BASE_CLASS}
              style={{
                backgroundColor: isActive
                  ? style.borderColor.replace(/[\d.]+\)$/, '0.50)')
                  : style.backgroundColor,
                borderColor: style.borderColor,
                color: style.color,
                ...(isActive ? { transform: 'scale(1.05)', boxShadow: `0 4px 12px ${style.backgroundColor}` } : {}),
              }}
              aria-expanded={isActive}
              aria-label={labels[mood]}
            >
              {labels[mood]}
            </button>
          );
        })}
      </div>

      {/* Grid preview area */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          activeMood ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {activeMood && (
          <div
            className="rounded-xl p-5 md:p-6"
            style={{ backgroundColor: 'rgba(34,38,46,0.95)' }}
          >
            {activeDramas.length > 0 ? (
              <>
                {/* Grid: 3 cols desktop, 2 cols mobile */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {activeDramas.map((drama) => (
                    <Link
                      key={drama.slug}
                      href={`/${locale}/drama/${drama.slug}`}
                      className="group flex gap-3 rounded-lg p-2 transition-colors duration-200 hover:bg-white/5"
                    >
                      {/* Poster */}
                      <div className="flex-shrink-0 w-16 h-24 md:w-20 md:h-28 rounded-lg overflow-hidden bg-dingyao relative">
                        {drama.posterUrl ? (
                          <img
                            src={drama.posterUrl}
                            alt={drama.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-ink-5 text-xl font-display">{drama.title.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex flex-col justify-center min-w-0">
                        <h3 className="text-sm md:text-base text-ivory-soft font-medium truncate group-hover:text-ivory transition-colors">
                          {drama.title}
                        </h3>
                        {drama.rating && (
                          <span className="text-xs mt-1" style={{ color: '#d4a853' }}>
                            ★ {drama.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* View all link */}
                <div className="mt-5 text-center">
                  <Link
                    href={`/${locale}/best/${activeMood}`}
                    className="inline-flex items-center gap-1 text-sm font-display tracking-wide transition-colors duration-200 hover:opacity-80"
                    style={{ color: '#8fb8c8' }}
                  >
                    View all {activeTotal} {labels[activeMood]} dramas
                    <span className="ml-1">→</span>
                  </Link>
                </div>
              </>
            ) : (
              /* Empty mood */
              <div className="text-center py-8">
                <p className="text-ink-4 text-sm font-display">
                  Coming soon — we're curating dramas for this mood
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
