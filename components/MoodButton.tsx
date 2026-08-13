'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MOOD_GRADIENT_CLASS } from '@/lib/utils/helpers';

interface MoodButtonProps {
  mood: string;
  label: string;
  locale: string;
  dramaSlugs?: string[];
}

/**
 * MoodButton — 情绪按钮组件
 * 80×80px, gradient background, hover glaze effect
 */
export default function MoodButton({ mood, label, locale, dramaSlugs = [] }: MoodButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const gradientClass = MOOD_GRADIENT_CLASS[mood] || 'bg-mood-romantic';

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${gradientClass} w-20 h-20 rounded-song flex flex-col items-center justify-center glaze-hover cursor-pointer ${
          isExpanded ? 'ring-2 ring-ruyao ring-offset-2 ring-offset-sujuan' : ''
        }`}
        aria-expanded={isExpanded}
        aria-label={label}
      >
        <span className="text-xs text-white/90 font-medium text-center leading-tight px-1">{label}</span>
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
