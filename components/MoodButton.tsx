'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MOOD_SELECTOR_BASE_CLASS, MOOD_SELECTOR_STYLES } from '@/lib/utils/helpers';

interface MoodButtonProps {
  mood: string;
  label: string;
  locale: string;
  dramaSlugs?: string[];
}

/**
 * MoodButton — Frosted glass mood selector button
 * Semi-transparent colored bg + backdrop-blur + border
 * Uses inline styles for colors to avoid Tailwind opacity variant issues
 */
export default function MoodButton({ mood, label, locale, dramaSlugs = [] }: MoodButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const moodStyle = MOOD_SELECTOR_STYLES[mood] || MOOD_SELECTOR_STYLES['romantic'];

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={MOOD_SELECTOR_BASE_CLASS}
        style={{
          backgroundColor: moodStyle.backgroundColor,
          borderColor: moodStyle.borderColor,
          color: moodStyle.color,
        }}
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
