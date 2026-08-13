'use client';

import { useState, useEffect } from 'react';

interface DramaHeroImagesProps {
  slug: string;
  initialPosterUrl?: string;
  initialBackdropUrl?: string;
  title: string;
}

/**
 * DramaHeroImages — client component
 * Fetches real poster/backdrop URLs from TMDB API when server-side URLs are placeholders.
 * Handles both backdrop (hero background) and poster (side card) images.
 */
export default function DramaHeroImages({
  slug,
  initialPosterUrl,
  initialBackdropUrl,
  title,
}: DramaHeroImagesProps) {
  const [posterUrl, setPosterUrl] = useState<string | null>(initialPosterUrl || null);
  const [backdropUrl, setBackdropUrl] = useState<string | null>(initialBackdropUrl || null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    if (!fetchAttempted && (!posterUrl || !backdropUrl)) {
      setFetchAttempted(true);
      fetch(`/api/tmdb-poster?slug=${slug}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.posterUrl && !posterUrl) {
            setPosterUrl(data.posterUrl);
          }
          if (data.backdropUrl && !backdropUrl) {
            setBackdropUrl(data.backdropUrl);
          }
        })
        .catch(() => {}); // Silently fail
    }
  }, [fetchAttempted, posterUrl, backdropUrl, slug]);

  return (
    <>
      {/* Backdrop */}
      {backdropUrl ? (
        <img
          src={backdropUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-ink-2 to-ink-3" />
      )}

      {/* Poster — rendered via portal-style absolute positioning for the hero poster slot */}
      {/* The poster is handled separately via data attributes so the parent can access it */}
    </>
  );
}

/**
 * DramaPoster — separate client component just for the poster card
 */
export function DramaPoster({
  slug,
  initialUrl,
  title,
}: {
  slug: string;
  initialUrl?: string;
  title: string;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl || null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    if (!fetchAttempted && !url) {
      setFetchAttempted(true);
      fetch(`/api/tmdb-poster?slug=${slug}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.posterUrl) {
            setUrl(data.posterUrl);
          }
        })
        .catch(() => {});
    }
  }, [fetchAttempted, url, slug]);

  if (url) {
    return (
      <img
        src={url}
        alt={title}
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="w-full h-full bg-dingyao flex items-center justify-center">
      <span className="text-ink-5 text-3xl font-display">剧</span>
    </div>
  );
}
