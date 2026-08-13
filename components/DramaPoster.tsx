'use client';

import { useState } from 'react';
import { isPlaceholderPoster } from '@/lib/utils/helpers';

export default function DramaPoster({
  src,
  alt,
  title,
  className = 'w-full h-full object-cover',
  priority = false,
}: {
  src?: string | null;
  alt: string;
  title: string;
  className?: string;
  priority?: boolean;
}) {
  const [error, setError] = useState(false);

  // No image or placeholder -> show initial-based fallback
  if (!src || isPlaceholderPoster(src) || error) {
    const initial = title.charAt(0).toUpperCase();
    return (
      <div className="w-full h-full bg-dingyao flex items-center justify-center">
        <span className="text-ink-4 text-2xl font-display">{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setError(true)}
    />
  );
}
