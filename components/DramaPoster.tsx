'use client';

import { useState, useEffect } from 'react';
import { isPlaceholderPoster } from '@/lib/utils/helpers';

export default function DramaPoster({
  src,
  alt,
  title,
  slug,
  className = 'w-full h-full object-cover',
  priority = false,
}: {
  src?: string | null;
  alt: string;
  title: string;
  slug?: string;
  className?: string;
  priority?: boolean;
}) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(src || null);
  const [error, setError] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // If no poster or placeholder, try TMDB first, then TVmaze as fallback
  useEffect(() => {
    if (!fetchAttempted && (!resolvedSrc || isPlaceholderPoster(resolvedSrc)) && slug) {
      setFetchAttempted(true);

      // Try TMDB first
      fetch(`/api/tmdb-poster?slug=${slug}`)
        .then(res => res.json())
        .then(data => {
          if (data.posterUrl) {
            setResolvedSrc(data.posterUrl);
          } else {
            // TMDB failed — fallback to TVmaze
            return fetch(`/api/tvmaze-poster?slug=${slug}`)
              .then(res => res.json())
              .then(tvmazeData => {
                if (tvmazeData.posterUrl) {
                  setResolvedSrc(tvmazeData.posterUrl);
                }
              });
          }
        })
        .catch(() => {}); // Silently fail
    }
  }, [resolvedSrc, fetchAttempted, slug]);

  // No image or placeholder -> show initial-based fallback
  if (!resolvedSrc || isPlaceholderPoster(resolvedSrc) || error) {
    const initial = title.charAt(0).toUpperCase();
    return (
      <div className="w-full h-full bg-dingyao flex items-center justify-center">
        <span className="text-ink-4 text-2xl font-display">{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      width={400}
      height={600}
      onError={() => setError(true)}
    />
  );
}
