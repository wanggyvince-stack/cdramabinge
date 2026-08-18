'use client';

import { useState } from 'react';
import MoodButton from '@/components/MoodButton';

interface DramaInfo {
  slug: string;
  title: string;
  posterUrl: string | null;
}

interface MoodDiscoverySectionProps {
  moods: readonly string[];
  labels: Record<string, string>;
  dramaMap: Record<string, DramaInfo[]>;
  locale: string;
}

/**
 * MoodDiscoverySection — Client component that manages single-select mood state.
 * Only one mood can be expanded at a time; clicking another collapses the previous.
 */
export default function MoodDiscoverySection({
  moods,
  labels,
  dramaMap,
  locale,
}: MoodDiscoverySectionProps) {
  const [activeMood, setActiveMood] = useState<string | null>(null);

  const handleMoodClick = (mood: string) => {
    setActiveMood((prev) => (prev === mood ? null : mood));
  };

  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-6">
      {moods.map((mood) => (
        <MoodButton
          key={mood}
          mood={mood}
          label={labels[mood]}
          locale={locale}
          dramas={dramaMap[mood] || []}
          isExpanded={activeMood === mood}
          onToggle={() => handleMoodClick(mood)}
        />
      ))}
    </div>
  );
}
