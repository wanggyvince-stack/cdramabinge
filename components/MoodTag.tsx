import { MOOD_EMOJI, MOOD_GRADIENT_CLASS } from '@/lib/utils/helpers';

interface MoodTagProps {
  mood: string;
  label: string;
  size?: 'sm' | 'md';
}

/**
 * MoodTag — 情绪标签（渐变色）
 * Displays a small gradient pill with mood emoji + label
 */
export default function MoodTag({ mood, label, size = 'sm' }: MoodTagProps) {
  const gradientClass = MOOD_GRADIENT_CLASS[mood] || 'bg-mood-romantic';
  const emoji = MOOD_EMOJI[mood] || '🎬';

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-3 py-1 text-sm gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-song text-white font-medium ${sizeClasses} ${gradientClass}`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}
