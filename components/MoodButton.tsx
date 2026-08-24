'use client';

import Link from 'next/link';
import { MOOD_SELECTOR_BASE_CLASS, MOOD_SELECTOR_STYLES } from '@/lib/utils/helpers';

interface DramaInfo {
  slug: string;
  title: string;
  posterUrl: string | null;
}

interface MoodButtonProps {
  mood: string;
  label: string;
  locale: string;
  dramas?: DramaInfo[];
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * MoodButton — Frosted glass mood selector button
 * Controlled component: expansion state managed by parent (MoodDiscoverySection).
 * Only one mood can be expanded at a time.
 */
export default function MoodButton({ mood, label, locale, dramas = [], isExpanded, onToggle }: MoodButtonProps) {
  const moodStyle = MOOD_SELECTOR_STYLES[mood] || MOOD_SELECTOR_STYLES['romantic'];

  return (
    <div className="flex flex-col items-center w-full sm:w-auto">
      <button
        onClick={onToggle}
        className={MOOD_SELECTOR_BASE_CLASS}
        style={{
          backgroundColor: isExpanded
            ? moodStyle.borderColor.replace(/[\d.]+\)$/, '0.50)')
            : moodStyle.backgroundColor,
          borderColor: moodStyle.borderColor,
          color: moodStyle.color,
          ...(isExpanded ? { transform: 'scale(1.05)', boxShadow: `0 4px 12px ${moodStyle.backgroundColor}` } : {}),
        }}
        aria-expanded={isExpanded}
        aria-label={label}
      >
        {label}
      </button>

      {/* Expanded recommendations (horizontal scroll) */}
      {isExpanded && dramas.length > 0 && (
        <div className="w-full mt-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
          <div className="flex gap-3 min-w-max px-1">
            {dramas.map((drama) => (
              <Link
                key={drama.slug}
                href={`/${locale}/drama/${drama.slug}`}
                className="flex-shrink-0 w-28"
              >
                <div className="song-card overflow-hidden">
                  <div className="aspect-[9/14] bg-dingyao relative">
                    {drama.posterUrl ? (
                      <img
                        src={drama.posterUrl}
                        alt={drama.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                    width={400}
                    height={600}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-ink-5 text-2xl font-display">{drama.title.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-ink-2 truncate mt-1 text-center">{drama.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
