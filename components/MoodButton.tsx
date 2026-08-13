'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MOOD_SOLID_CLASS } from '@/lib/utils/helpers';

interface MoodButtonProps {
  mood: string;
  label: string;
  locale: string;
  dramaSlugs?: string[];
}

/**
 * MoodButton — Mood pill button
 * Pill-shaped with mood color, hover scale effect
 */
export default function MoodButton({ mood, label, locale, dramaSlugs = [] }: MoodButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const bgClass = MOOD_SOLID_CLASS[mood] || 'bg-mood-romantic';

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          px-8 py-3.5 md:px-8 md:py-3.5
          px-6 py-2.5
          rounded-full
          ${bgClass}
          text-white
          font-display
          text-base
          tracking-wide
          shadow-md
          hover:scale-105
          hover:-translate-y-0.5
          hover:shadow-lg
          transition-all duration-song
          cursor-pointer
        `}
        aria-expanded={isExpanded}
        aria-label={label}
      >
        {label}
      </button>

      {/* Expanded recommendations (horizontal scroll) */}
      {isExpanded && dramaSlugs.length > 0 && (
        <div className="w-full mt-4 horizontal-scroll song-scrollbar">
          <div className="flex gap-3 pb-2">
            {dramaSlugs.map((slug) => (
              <Link
                key={slug}
                href={`/${locale}/drama/${slug}`}
                className="flex-shrink-0 w-28"
              >
                <div className="song-card overflow-hidden">
                  <div className="aspect-[9/14] bg-dingyao flex items-center justify-center">
                    <span className="text-ink-5 text-xs text-center px-2">{slug}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
