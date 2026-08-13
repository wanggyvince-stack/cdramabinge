'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MOOD_PILL_LIGHT_CLASS, isPlaceholderPoster } from '@/lib/utils/helpers';

interface DramaCardProps {
  slug: string;
  title: string;
  posterUrl?: string | null;
  moods?: string[];
  moodLabels?: Record<string, string>;
  comment?: string;
  year?: number | null;
  locale: string;
}

/**
 * DramaCard — 剧卡片组件
 * Song Dynasty style: 9:16 poster, subtle border, gradient overlay
 * When poster is missing/placeholder, fetches real poster from TMDB via API route
 */
export default function DramaCard({
  slug,
  title,
  posterUrl,
  moods = [],
  moodLabels = {},
  comment,
  year,
  locale,
}: DramaCardProps) {
  const [resolvedPoster, setResolvedPoster] = useState<string | null>(posterUrl || null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // If no poster, try to fetch from TMDB API
  useEffect(() => {
    if (!resolvedPoster && !fetchAttempted) {
      setFetchAttempted(true);
      fetch(`/api/tmdb-poster?slug=${slug}`)
        .then(res => res.json())
        .then(data => {
          if (data.posterUrl) {
            setResolvedPoster(data.posterUrl);
          }
        })
        .catch(() => {}); // Silently fail
    }
  }, [resolvedPoster, fetchAttempted, slug]);

  return (
    <Link
      href={`/${locale}/drama/${slug}`}
      className="group block w-full"
    >
      <div className="song-card overflow-hidden glaze-hover">
        {/* Poster */}
        <div className="relative aspect-[9/16] overflow-hidden rounded-t-song">
          {resolvedPoster && !isPlaceholderPoster(resolvedPoster) ? (
            <img
              src={resolvedPoster}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setResolvedPoster(null)}
            />
          ) : (
            <div className="w-full h-full bg-dingyao flex items-center justify-center">
              <span className="text-ink-4 text-4xl font-display">{title.charAt(0).toUpperCase()}</span>
            </div>
          )}

          {/* Bottom gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          {/* Title on overlay */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="font-display text-base font-semibold text-white leading-tight line-clamp-2">
              {title}
            </h3>
            {year && (
              <span className="text-xs text-white/60 mt-0.5">{year}</span>
            )}
          </div>
        </div>

        {/* Info section */}
        <div className="p-3 bg-dingyao">
          {/* Mood tags */}
          {moods.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {moods.slice(0, 3).map((mood) => (
                <span
                  key={mood}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide border transition-colors duration-song ${MOOD_PILL_LIGHT_CLASS[mood] || 'bg-mood-romantic/10 text-mood-romantic border-mood-romantic/20'}`}
                >
                  {moodLabels[mood] || mood}
                </span>
              ))}
            </div>
          )}

          {/* Editorial comment */}
          {comment && (
            <p className="text-xs text-ink-4 line-clamp-2 leading-relaxed mt-1 italic">
              &ldquo;{comment}&rdquo;
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
